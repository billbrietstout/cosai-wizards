# Embedding CoSAI Wizards

The CoSAI wizards are plain HTML/CSS/JS. They run with **zero build step**,
no framework, no server, and no network calls at runtime (the only
third-party dependency, jsPDF, is self-hosted under `/shared/vendor/`).

This makes them easy to host, embed, or vendor into another site. Three
integration patterns are supported.

---

## 1. Standalone (host the files yourself)

The fastest way to ship a wizard on your own domain is to copy the
directory into your static site root.

```bash
# copy just one wizard + the shared assets it depends on
cp -R wizards/security-controls   /your-site/wizards/security-controls
cp -R shared                      /your-site/shared
```

Directory layout after copying:

```
/your-site/
  shared/
    styles.css
    vendor/jspdf.umd.min.js
  wizards/
    security-controls/
      index.html
      wizard.js
      data.json
      styles.css
```

Open `https://your-site.example/wizards/security-controls/` — that's it.
All state is kept client-side in `localStorage`; there is no backend.

> **Tip:** Serve the files over HTTP(S). Modern browsers block `fetch()`
> of `data.json` when loaded from a `file://` URL, which will leave the
> wizard with an empty control list.

### Minimum viable hosting

- Any static host (GitHub Pages, Netlify, S3/CloudFront, nginx, Caddy).
- No server-side runtime, no build pipeline, no environment variables.
- Recommended HTTP headers (optional but nice):

  ```http
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:
  Referrer-Policy: no-referrer
  Permissions-Policy: interest-cohort=()
  ```

---

## 2. Iframe embed

If your main site is a CMS, a docs portal, or a product dashboard, the
simplest integration is an `<iframe>`.

```html
<iframe
  src="https://billbrietstout.github.io/cosai-wizards/wizards/security-controls/"
  title="CoSAI AI Security Controls Assessment"
  loading="lazy"
  referrerpolicy="no-referrer"
  style="width:100%; height:100vh; border:0;"
  sandbox="allow-scripts allow-same-origin allow-downloads allow-popups"
></iframe>
```

Notes:

- `allow-scripts` and `allow-same-origin` are required for the wizard
  to render controls, score answers, and write to `localStorage`.
- `allow-downloads` enables the "Export JSON" and "Generate PDF" buttons
  to trigger a download in the parent frame.
- `localStorage` is scoped to the **wizard's** origin (the iframe `src`),
  not your parent page. Users will see their progress persist across
  visits to the same iframe URL.
- No `postMessage` bridge is shipped today. If you need the parent page
  to read/write wizard state, open an issue — we'd rather design that
  API with a real embedder on the other end.

### Responsive height

Wizards are tall. A fixed `height:100vh` is usually fine, but if you'd
rather let the iframe size itself, the open-source
[`iframe-resizer`](https://github.com/davidjbradshaw/iframe-resizer)
library works without modifications.

---

## 3. Pulling the engine via npm (ES module)

> **Status:** aspirational / under discussion with CoSAI.

The two v1 wizards (`security-controls`, `controls-assessment`) share a
single vanilla-JS engine in `wizards/<name>/wizard.js` that takes a
`data.json` payload and renders into a host element. If the project is
accepted by CoSAI, we plan to publish the engine as
`@cosai/wizards-engine` on npm.

Sketch of the intended API:

```html
<div id="cosai-wizard"></div>
<link rel="stylesheet"
      href="node_modules/@cosai/wizards-engine/dist/styles.css">
<script type="module">
  import { mountWizard } from '@cosai/wizards-engine';
  import data from '@cosai/wizards-data-security-controls' with { type: 'json' };

  mountWizard(document.getElementById('cosai-wizard'), {
    data,
    storageKey: 'myorg:security-controls:v1',
    pdfFilename: 'MyOrg-Controls.pdf',
  });
</script>
```

Until that package ships, treat the `wizard.js` file in each wizard
directory as the engine and copy it alongside its `data.json`. The API
above mirrors what the current inline bootstrap does, so the migration
is a rename, not a rewrite.

---

## Data shape

`data.json` is the single source of truth for each wizard. It declares:

| Field      | Purpose                                                              |
| ---------- | -------------------------------------------------------------------- |
| `meta`     | Title, subtitle, badge text, PDF filename, `localStorage` key, sources. |
| `context`  | The pre-assessment context questions (industry, model type, etc).    |
| `layers`   | The five CoSAI layers with names, titles, intro copy, and colors.    |
| `controls` | Per-layer arrays of controls (`id`, `label`, `why`, `aicm`, `phases`, `aml`). |
| `owasp`    | OWASP Top 10 for LLM Applications cross-references.                  |
| `scoring`  | Weights and thresholds used to compute the live score.               |

To add, remove, or retitle a control, edit `data.json`. No JS changes
required. The engine re-renders on load from whatever the JSON says.

---

## Licensing recap

- Wizard code, styles, and data: **Apache-2.0** (see `/LICENSE`).
- jsPDF (vendored at `/shared/vendor/jspdf.umd.min.js`): **MIT**,
  attributed in `/NOTICE`.
- No external fonts, no analytics, no cookies, no tracking.

Ship it behind any CSP you like.
