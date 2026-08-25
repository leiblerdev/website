# leibler.dev

Static site. No build step.

- `index.html`, `team.html`, `404.html`: pages. Shared styles in `assets/css/site.css`, scripts in `assets/js/`.
- `llms.txt`, `robots.txt`, `sitemap.xml`, `favicon.svg`, `apple-touch-icon.png`, `og.png`: root files.
- `vercel.json`: clean URLs (`/team` serves `team.html`), cache and security headers.
- `/assets/*` is cached for a year as immutable, so every change to `site.css` or the JS must bump the `?v=` query on the asset links in all three HTML files, or returning visitors keep the old files.

## Preview

    python3 serve.py 8765     # http://localhost:8765, mimics clean URLs and the 404 page

## Deploy

Vercel project root: this folder (`website`). Framework preset: Other. No build command, output directory `.`.
Then add `leibler.dev` under Domains and point DNS at Vercel.
