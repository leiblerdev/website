# leibler.dev

Static site, no build step. Everything Vercel serves is under `public/`; everything else is tooling.

```
public/
  index.html  kullback.html  team.html  404.html     pages (clean URLs: /kullback serves kullback.html)
  robots.txt  sitemap.xml  llms.txt                  root files crawlers expect
  assets/css/    site.css (shared), kullback.css
  assets/js/     hero.js, figures.js, kullback.js
  assets/img/    photos, og.png, logo/ (every logo variant, see logo/README.md)
  assets/icons/  favicon.svg, favicon-32.png, apple-touch-icon.png
tools/serve.py   local preview
vercel.json      output directory, clean URLs, cache and security headers
```

`/assets/*` is cached for a year as immutable (icons and og.png for a week), so every change to a CSS or JS file must bump the `?v=` query on its links in all four pages, or returning visitors keep the old file.

## Preview

    python3 tools/serve.py 8765     # http://localhost:8765, mimics clean URLs and the 404 page

## Deploy

Vercel project root: this repository. Framework preset: Other, no build command; `vercel.json` sets the output directory to `public`. Every push to `main` deploys. Check the site at 360px wide before pushing.
