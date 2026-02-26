import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TODAY = new Date();
const DATE = TODAY.toISOString().slice(0, 10);
const SLUG = `weekly-ai-leadership-brief-${DATE}`;
const EN_FILE = path.join(ROOT, 'src/content/docs', `${SLUG}.md`);
const ZH_FILE = path.join(ROOT, 'src/content/zhdocs', `${SLUG}.md`);

const AI_PROVIDER = (process.env.AI_PROVIDER || 'deepseek').toLowerCase();
const AI_API_KEY =
  process.env.AI_API_KEY ||
  (AI_PROVIDER === 'deepseek' ? process.env.DEEPSEEK_API_KEY : process.env.OPENAI_API_KEY);
if (!AI_API_KEY) {
  console.error(
    `Missing API key. Set ${AI_PROVIDER === 'deepseek' ? 'DEEPSEEK_API_KEY' : 'OPENAI_API_KEY'} (or AI_API_KEY).`,
  );
  process.exit(1);
}

const API_CONFIG =
  AI_PROVIDER === 'deepseek'
    ? {
        url: 'https://api.deepseek.com/chat/completions',
        model: process.env.AI_MODEL || 'deepseek-chat',
      }
    : {
        url: 'https://api.openai.com/v1/chat/completions',
        model: process.env.AI_MODEL || process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      };

if (fs.existsSync(EN_FILE) || fs.existsSync(ZH_FILE)) {
  console.log(`Weekly brief already exists for ${DATE}.`);
  process.exit(0);
}

const queries = [
  'AI leadership decision making governance enterprise AI',
  'AI strategy executives board governance risk',
  'workforce AI adoption productivity management',
];

function decodeXml(s = '') {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return decodeXml(m?.[1]?.trim() || '');
}

async function fetchRss(query) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query + ' when:7d')}&hl=en-US&gl=US&ceid=US:en`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);
  return res.text();
}

function parseItems(xml) {
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  return blocks.map((b) => ({
    title: extractTag(b, 'title').replace(/\s-\s[^-]+$/, '').trim(),
    link: extractTag(b, 'link'),
    pubDate: extractTag(b, 'pubDate'),
    source: extractTag(b, 'source') || 'Source',
  }));
}

const all = [];
for (const q of queries) {
  const xml = await fetchRss(q);
  all.push(...parseItems(xml));
}

const seen = new Set();
const picked = [];
for (const item of all) {
  const key = `${item.title}::${item.link}`;
  if (!item.title || !item.link || seen.has(key)) continue;
  seen.add(key);
  picked.push(item);
  if (picked.length >= 12) break;
}

if (picked.length < 6) {
  console.error('Not enough source items to build weekly brief.');
  process.exit(1);
}

const sourceText = picked
  .map((i, idx) => `${idx + 1}. ${i.title} | ${i.source} | ${i.link}`)
  .join('\n');

const prompt = `You are writing AILD weekly content for executives.
Create bilingual output in strict JSON (no markdown fences), using the sources below.

Requirements:
- Focus: AI Leadership and Development, especially decision-making, governance, operating model.
- Produce concise, practical executive brief.
- English and Simplified Chinese versions must be equivalent.
- Use only claims that can be reasonably grounded in provided sources.

Output JSON schema:
{
  "en": {
    "title": "...",
    "description": "...",
    "sections": [
      {"heading":"What changed this week","bullets":["...","...","..."]},
      {"heading":"Leadership implications","bullets":["...","...","..."]},
      {"heading":"Decisions for the next 7 days","bullets":["...","...","..."]}
    ]
  },
  "zh": {
    "title": "...",
    "description": "...",
    "sections": [
      {"heading":"本周变化","bullets":["...","...","..."]},
      {"heading":"对管理层的含义","bullets":["...","...","..."]},
      {"heading":"未来7天应做的决策","bullets":["...","...","..."]}
    ]
  }
}

Sources:\n${sourceText}`;

const response = await fetch(API_CONFIG.url, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${AI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: API_CONFIG.model,
    temperature: 0.2,
    max_tokens: 1800,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'Return strict JSON only.' },
      { role: 'user', content: prompt },
    ],
  }),
});

if (!response.ok) {
  const err = await response.text();
  throw new Error(`${AI_PROVIDER} request failed: ${response.status} ${err}`);
}

const data = await response.json();
const raw = data.choices?.[0]?.message?.content || '';
function extractJsonPayload(text) {
  if (!text) return null;

  // Prefer fenced JSON if the model wrapped output in markdown.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();

  // Otherwise take the outermost JSON object in the response.
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    return text.slice(first, last + 1).trim();
  }
  return null;
}

const jsonPayload = extractJsonPayload(raw);
if (!jsonPayload) {
  throw new Error(`Model response is not valid JSON payload. Raw: ${raw.slice(0, 400)}`);
}

let parsed;
try {
  parsed = JSON.parse(jsonPayload);
} catch (e) {
  throw new Error(`JSON parse failed: ${e.message}. Raw: ${raw.slice(0, 400)}`);
}

const sourceListMd = picked.slice(0, 8).map((i) => `- [${i.title}](${i.link}) (${i.source})`).join('\n');

function renderMd(lang, obj) {
  const title = obj.title?.trim() || `Weekly AI Leadership Brief (${DATE})`;
  const description = obj.description?.trim() || 'Weekly executive brief for AI leadership and decision-making.';
  const readingTime = lang === 'en' ? '8 min' : '8分钟';
  const audience = lang === 'en' ? 'Executive team, strategy leads, operations leads' : '高管团队、战略负责人、运营负责人';
  const sectionText = (obj.sections || [])
    .map((s) => {
      const bullets = (s.bullets || []).map((b) => `- ${b}`).join('\\n');
      return `## ${s.heading}\n\n${bullets}`;
    })
    .join('\n\n');

  return `---
title: ${title}
description: ${description}
pubDate: '${DATE}'
updatedDate: '${DATE}'
tags: ['weekly-brief', 'leadership', 'research']
related: ['ai-decision-intelligence-stack-executives', 'trust-vs-override-framework', 'board-ai-governance-briefing']
audience: ${audience}
readingTime: ${readingTime}
outcomes:
  - ${lang === 'en' ? 'Weekly executive signal summary' : '每周管理层信号摘要'}
  - ${lang === 'en' ? 'Concrete decision actions for the next 7 days' : '未来7天可执行决策动作'}
---

${sectionText}

## ${lang === 'en' ? 'Source links' : '来源链接'}

${sourceListMd}
`;
}

const enMd = renderMd('en', parsed.en || {});
const zhMd = renderMd('zh', parsed.zh || {});

fs.writeFileSync(EN_FILE, enMd, 'utf8');
fs.writeFileSync(ZH_FILE, zhMd, 'utf8');

console.log(`Created:\n- ${path.relative(ROOT, EN_FILE)}\n- ${path.relative(ROOT, ZH_FILE)}`);
