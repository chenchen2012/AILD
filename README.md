# AILD.org (Astro wiki-style content system)

This project is now an Astro-based, SEO-first site with a wiki-style internal-link content graph.

## Architecture

- `src/layouts/Layout.astro`: shared layout + metadata + navigation
- `src/content/docs/*.md`: long-form knowledge pages (cornerstone content)
- `src/pages/learn/[slug].astro`: dynamic docs route from content collection
- `src/pages/*.astro`: business and conversion pages (`playbooks`, `templates`, `cases`, `research`, `about`, `contact`)
- `src/pages/en|es|zh/index.astro`: multilingual entry pages
- `public/robots.txt`: crawler control
- `@astrojs/sitemap`: automatic sitemap generation in build

## Why this is better than pure static HTML

- Easier to add and maintain content pages
- Better internal-linking structure for SEO
- Cleaner multilingual expansion model
- Shared SEO metadata and consistent design system

## Run locally

```bash
cd /Users/cc801/Downloads/aild.org
npm install
npm run dev
```

## Build

```bash
npm run build
```

Build output is in `dist/`.

## Notes

- Previous static version is preserved in `legacy-static/`.
- Add new knowledge articles by creating Markdown files in `src/content/docs/`.

## Decap CMS (Auto Publish)

Decap is configured at `/admin` with Git-based publishing.

Files:
- `public/admin/index.html`
- `public/admin/config.yml`
- `netlify.toml`

Netlify setup required:
1. Connect this repo to Netlify.
2. In Netlify: `Site configuration -> Identity`, enable Identity.
3. In Netlify Identity: enable `Git Gateway`.
4. Invite your editor account(s).
5. Open `https://your-site/admin/` and publish content.

For local CMS testing:
1. Run `npx decap-server` in one terminal.
2. Run `npm run dev` in another terminal.
3. Open `http://localhost:4321/admin/`.
