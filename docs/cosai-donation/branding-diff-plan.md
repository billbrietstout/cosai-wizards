# Pre-donation branding & dependency cleanup plan

Working document for the CoSAI wizards donation. Tracks **exact** text / link
changes required in the four HTML files under `cosai-standalone/` before they
are imported into the public `cosai-wizards` repo.

Source files (line counts):

| File                                     | Lines |
| ---------------------------------------- | ----: |
| `cosai-ai-security-controls-wizard.html` | 1,789 |
| `security-wizard.html`                   | 1,763 |
| `srf-stress-test.html`                   |   871 |
| `layer_integration_matrix.html`          |   551 |

(The `enterprise_security_hierarchy_cli.html` wizard was dropped from the
donation scope: it's generic DoD/enterprise baseline content without explicit
AI framing, so it wasn't a fit for CoSAI's AI-specific remit.)

## 1. "AI Readiness" branding removal (must fix)

Three files carry the private platform wordmark. Replace with a neutral,
CoSAI-appropriate label. The replacement text below is a suggestion: confirm
with CoSAI before shipping.

| File                                     | Line | Current                                                                 | Proposed                                                                                             |
| ---------------------------------------- | ---: | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `srf-stress-test.html`                   |    6 | `<title>CoSAI Framework Stress Test: AI Readiness</title>`             | `<title>CoSAI Framework Stress Test</title>`                                                         |
| `srf-stress-test.html`                   |  519 | `<a href="/" class="header-wordmark">AI Readiness</a>`                  | `<a href="https://www.coalitionforsecureai.org/" class="header-wordmark" rel="noopener">CoSAI</a>`   |
| `cosai-ai-security-controls-wizard.html` |    6 | `<title>CoSAI: AI Security Controls Assessment: AI Readiness</title>` | `<title>CoSAI: AI Security Controls Assessment</title>`                                             |
| `layer_integration_matrix.html`          |  363 | `<a href="/" class="platform-wordmark">AI Readiness</a>`                | `<a href="https://www.coalitionforsecureai.org/" class="platform-wordmark" rel="noopener">CoSAI</a>` |

`security-wizard.html` already has no "AI Readiness" string in markup: OK as-is
at markup level; still needs the dependency cleanup in §2.

## 2. Third-party dependencies (must self-host)

The wizards currently fetch two things from the public internet. CoSAI will
want everything self-hosted (licensing clarity, offline use, CSP friendliness,
no third-party tracking). Download once, commit, and rewrite the tags.

### 2.1 jsPDF (CDN) → self-hosted

Affected files:

- `cosai-ai-security-controls-wizard.html` line 9
- `security-wizard.html` line 7

Current:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
```

Target:

```html
<script src="../../shared/vendor/jspdf.umd.min.js"></script>
```

Action: pin `jsPDF 2.5.1`, copy into `shared/vendor/jspdf.umd.min.js`, record
SHA-256 in `NOTICE`, and add jsPDF's MIT license text to `third_party/LICENSES/`.

### 2.2 Google Fonts (Outfit, Fraunces, DM Mono) → self-hosted or system stack

Affected files (preconnect + stylesheet link):

- `cosai-ai-security-controls-wizard.html` lines 7–8
- `srf-stress-test.html` lines 7–8
- `layer_integration_matrix.html` lines 7–8

Two acceptable options, in order of preference for a donation:

1. **System font stack**: drop the Google Fonts link entirely and keep the
   existing CSS fallback (`-apple-system, BlinkMacSystemFont, 'Segoe UI',
system-ui, sans-serif`). Zero fetch, zero licensing question. Recommended
   for v1.
2. **Self-host** the three families from Google Fonts (SIL Open Font License 1.1)
   under `shared/vendor/fonts/` and rewrite the `<link>` to point to a local
   `fonts.css`. Keep this as v1.1 if CoSAI wants richer typography.

Either way, remove the `https://fonts.googleapis.com` preconnect lines.

## 3. Internal links that 404 off the CoSAI site

Current `<a href="/">` wordmarks assume the wizard is served from the AI
Readiness SPA and that `/` is meaningful. On CoSAI's site `/` is their home
page, which is fine, but it is still an implicit coupling.

Recommendation (already reflected in §1): change every wordmark link to an
**absolute URL** to `https://www.coalitionforsecureai.org/`. That behaves
correctly no matter how the wizard is embedded.

## 4. Items that are already CoSAI-friendly (no change required)

- **No personal PII**: grep for `billstout`, `Bill Stout`, `vstout`, `brietstout`,
  `meridian`, `lucidinsights`, `aiposture`, `AI Posture`, `ai-governance-platform`
  returned **zero hits** inside `cosai-standalone/`.
- **No analytics / tracking**: no `gtag`, `ga(`, `fbq(`, `hotjar`, `segment`,
  `posthog`, `plausible`, `umami` references.
- **No cookies set** in wizard JS.
- **External reference links** (e.g. NIST CSRC, CIS, DISA, OWASP, ISO, CISA,
  NACD) are **authoritative-source links** and should stay; they strengthen
  the contribution's credibility.

## 5. Pre-copy checklist (run before `git add` in `cosai-wizards`)

- [ ] All four `<title>` strings mention only CoSAI (no "AI Readiness").
- [ ] All wordmark anchors point to
      `https://www.coalitionforsecureai.org/` with `rel="noopener"`.
- [ ] `cdnjs.cloudflare.com` removed; jsPDF served from
      `shared/vendor/jspdf.umd.min.js`.
- [ ] `fonts.googleapis.com` removed (v1 = system stack) OR fonts live in
      `shared/vendor/fonts/` with SIL OFL noted.
- [ ] `NOTICE` lists jsPDF (MIT) and any other bundled asset with SHA-256.
- [ ] No `http://` scheme anywhere (all references `https://`).
- [ ] `grep -R "AI Readiness" wizards/` returns nothing.
- [ ] `grep -R "ai-governance-platform\|meridian\|lucidinsights\|aiposture\|billstout" .`
      returns nothing.
- [ ] Lighthouse **Best Practices** and **SEO** ≥ 90 per wizard.
- [ ] Pa11y reports zero serious issues per wizard.

## 6. Scope for v1 vs v1.1

| Wizard                                   | v1 (donate now) | v1.1 (follow-up) |
| ---------------------------------------- | :-------------: | :--------------: |
| `security-wizard.html`                   |       ✅        |                  |
| `cosai-ai-security-controls-wizard.html` |       ✅        |                  |
| `srf-stress-test.html`                   |                 |        ✅        |
| `layer_integration_matrix.html`          |                 |        ✅        |

v1.1 items still need the same §1–§3 cleanup; copy them to
`wizards-raw/` in the new repo but do not wire them into the landing page
until v1.1.
