import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DOC_DIRS = [
  { dir: 'src/content/docs', lang: 'en' },
  { dir: 'src/content/zhdocs', lang: 'zh-CN' },
];
const STALE_DAYS = Number(process.env.STALE_DAYS || 45);
const WARN_DAYS = Number(process.env.WARN_DAYS || 30);

function toDate(value) {
  if (!value) return null;
  const d = new Date(String(value).replace(/^['\"]|['\"]$/g, ''));
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const lines = m[1].split('\n');
  const out = {};
  for (const line of lines) {
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) continue;
    out[kv[1]] = kv[2];
  }
  return out;
}

function daysSince(date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function readDocs() {
  const docs = [];
  for (const group of DOC_DIRS) {
    const abs = path.join(ROOT, group.dir);
    if (!fs.existsSync(abs)) continue;
    for (const file of fs.readdirSync(abs)) {
      if (!file.endsWith('.md')) continue;
      const full = path.join(abs, file);
      const raw = fs.readFileSync(full, 'utf8');
      const fm = parseFrontmatter(raw);
      const updated = toDate(fm.updatedDate) || toDate(fm.pubDate);
      if (!updated) continue;
      docs.push({
        slug: file.replace(/\.md$/, ''),
        lang: group.lang,
        title: (fm.title || '').replace(/^['\"]|['\"]$/g, ''),
        updated,
        ageDays: daysSince(updated),
        path: `${group.dir}/${file}`,
      });
    }
  }
  return docs.sort((a, b) => b.ageDays - a.ageDays);
}

function parseQueue(md) {
  const lines = md.split('\n').filter((l) => l.trim().startsWith('|'));
  if (lines.length < 3) return [];
  const rows = [];
  for (let i = 2; i < lines.length; i += 1) {
    const cols = lines[i].split('|').map((x) => x.trim()).filter(Boolean);
    if (cols.length < 8) continue;
    const [topic, keyword, intent, lang, publish_date, owner, status, url] = cols;
    rows.push({ topic, keyword, intent, lang, publish_date, owner, status, url });
  }
  return rows;
}

function buildReport(docs, queue) {
  const stale = docs.filter((d) => d.ageDays > STALE_DAYS);
  const warning = docs.filter((d) => d.ageDays > WARN_DAYS && d.ageDays <= STALE_DAYS);
  const published = docs.length;
  const now = new Date().toISOString().slice(0, 10);

  const queueOpen = queue.filter((q) => !['published'].includes(q.status.toLowerCase()));

  const lines = [];
  lines.push(`# AILD SEO Content Refresh Report (${now})`);
  lines.push('');
  lines.push(`- Total indexed docs checked: **${published}**`);
  lines.push(`- Overdue (> ${STALE_DAYS} days): **${stale.length}**`);
  lines.push(`- Warning (${WARN_DAYS}-${STALE_DAYS} days): **${warning.length}**`);
  lines.push(`- Open queue items: **${queueOpen.length}**`);
  lines.push('');

  lines.push('## Overdue pages');
  if (!stale.length) {
    lines.push('- None.');
  } else {
    for (const d of stale.slice(0, 50)) {
      lines.push(`- [${d.lang}] ${d.title || d.slug} (${d.ageDays} days) - \`${d.path}\``);
    }
  }
  lines.push('');

  lines.push('## Warning pages');
  if (!warning.length) {
    lines.push('- None.');
  } else {
    for (const d of warning.slice(0, 50)) {
      lines.push(`- [${d.lang}] ${d.title || d.slug} (${d.ageDays} days) - \`${d.path}\``);
    }
  }
  lines.push('');

  lines.push('## Publishing queue (from content-plan.md)');
  if (!queueOpen.length) {
    lines.push('- None.');
  } else {
    for (const q of queueOpen.slice(0, 20)) {
      lines.push(`- ${q.publish_date} | ${q.lang} | ${q.topic} | status: ${q.status} | owner: ${q.owner}`);
    }
  }
  lines.push('');
  lines.push('## Recommended actions this week');
  lines.push('1. Refresh at least 2 overdue pages (one EN, one ZH).');
  lines.push('2. Publish at least 2 new pages from queue.');
  lines.push('3. Ensure refreshed pages update `updatedDate` and add >=3 internal links.');

  return lines.join('\n');
}

const docs = readDocs();
let queue = [];
const planPath = path.join(ROOT, 'content-plan.md');
if (fs.existsSync(planPath)) {
  queue = parseQueue(fs.readFileSync(planPath, 'utf8'));
}

const report = buildReport(docs, queue);
fs.writeFileSync(path.join(ROOT, 'content-refresh-report.md'), report, 'utf8');
console.log(report);
