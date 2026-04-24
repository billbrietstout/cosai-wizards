# CoSAI Wizards

Five vanilla-web assessment wizards for practitioners working with the
**Coalition for Secure AI (CoSAI)** Shared Responsibility Framework and
adjacent security frameworks (CSA AICM, OWASP LLM Top 10, NIST AI RMF,
MITRE ATLAS).

No build step. No database. No tracking. No cookies. No external fonts.
Everything runs in the browser; every wizard self-contains its state in
`localStorage` and offers JSON import / export.

## What's included

| # | Wizard | Path | Status |
|---|--------|------|--------|
| 1 | **AI Security Controls Assessment**: 5-layer posture check with OWASP LLM Top 10 coverage and PDF export | `/wizards/security-controls/` | v1 |
| 2 | **AI Security Controls Assessment (CoSAI AICM variant)**: same engine, AICM-aligned control set, PDF export | `/wizards/controls-assessment/` | v1 |
| 3 | **Layer Integration Matrix**: seven enterprise-security domains crosswalked onto the CoSAI SRF five layers (AI Business & Usage → Information → Application → Platform → Model Provider) with RACI cells and §A.1.1 gap overlay | `/wizards/layer-matrix/` | v1.2 |
| 4 | **CoSAI SRF Stress Test**: walk a real incident through the five layers and find accountability gaps | `/wizards/srf-stress/` | v1.1 |
| 5 | **AI Policy Pyramid**, a five-tier governance map (Law → Standards → CoSAI SRF anchor → Threat catalogs → Engineering artefacts) with six worked AI use cases traced end-to-end with authoritative citations | `/wizards/policy-pyramid/` | v1.3 |

Wizards 1–2 are structurally factored: questions and scoring rules live in
`data.json`, wizard behaviour lives in `wizard.js`, presentation in
`styles.css`, mark-up in `index.html`. The originals are retained verbatim
under [`wizards-raw/`](./wizards-raw) so the rewrite can be diffed against
its source.

## Demo

Live on GitHub Pages:

> **https://billbrietstout.github.io/cosai-wizards/**

(Landing page links to every wizard. GitHub Pages is served from the
`main` branch, `/` root.)

### Run locally

```bash
# Any static server works; no build step is required.
python3 -m http.server 8080
# then open http://localhost:8080/
```

Opening `index.html` via `file://` also works for quick preview, though
some browsers may restrict `fetch()` of `data.json` under `file://`.

## Design goals

| Constraint | How it's enforced |
|---|---|
| Vanilla only | No `package.json`, no bundler, no framework. |
| Zero network at runtime | jsPDF self-hosted under `/shared/vendor/`, SHA-256 pinned in `NOTICE`. No fonts, trackers, or analytics. |
| Accessible | Keyboard navigation, visible focus rings, ARIA on radio groups, `prefers-reduced-motion`, 4.5:1 contrast. |
| Printable | `@media print` rules with page breaks between sections. |
| Persistable | Per-wizard state in `localStorage` with **Export JSON / Import JSON** buttons. |
| Embeddable | Drop-in standalone, `<iframe>`, or ES-module import: see [`docs/EMBEDDING.md`](./docs/EMBEDDING.md). |

## Donation intent

This repository is offered as a prospective contribution to the
**Coalition for Secure AI (CoSAI)** under OASIS Open. Ownership, name, and
release cadence are expected to transfer to CoSAI on acceptance. Until
then, Apache-2.0 governs use, and nothing herein implies CoSAI or OASIS
endorsement of the current content. See [`NOTICE`](./NOTICE) for third-party
attributions and trademark notes.

Contributions during the donation window follow a Developer Certificate of
Origin sign-off and, once CoSAI's CLA is available, will migrate to it. See
[`CONTRIBUTING.md`](./CONTRIBUTING.md).

## License

[Apache License 2.0](./LICENSE). See also [`NOTICE`](./NOTICE).

## Governance

  * [`CONTRIBUTING.md`](./CONTRIBUTING.md): DCO, development workflow, CLA placeholder
  * [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md): Contributor Covenant 2.1
  * [`SECURITY.md`](./SECURITY.md): responsible disclosure
