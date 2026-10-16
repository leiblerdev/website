# leibler.dev

Static site, no build step. Everything Vercel serves is under `public/`; everything else is tooling.

```
public/
  index.html  kullback.html  team.html  404.html     pages, each self-contained with CSS and script inline (clean URLs: /kullback serves kullback.html)
  robots.txt  sitemap.xml  llms.txt                  root files crawlers expect
  assets/img/    photos, og.png, logo/ (every logo variant, see logo/README.md)
  assets/icons/  favicon.svg, favicon-32.png, apple-touch-icon.png
tools/serve.py   local preview
vercel.json      output directory, clean URLs, cache and security headers
```

`/assets/*` is cached for a year as immutable (icons and og.png for a week), so any changed image or icon needs a new file name or a `?v=` query on its links, or returning visitors keep the old file.

## Preview

    python3 tools/serve.py 8765     # http://localhost:8765, mimics clean URLs and the 404 page

## Deploy

Vercel project root: this repository. Framework preset: Other, no build command; `vercel.json` sets the output directory to `public`. Every push to `main` deploys. Check the site at 360px wide before pushing.
