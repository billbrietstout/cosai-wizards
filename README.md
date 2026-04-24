# CoSAI Wizards

Four vanilla-web assessment wizards for practitioners working with the
**[CoSAI AI Shared Responsibility Framework](https://github.com/cosai-oasis/ws2-defenders)**
(Draft V0.7, 2026, OASIS Open / Coalition for Secure AI Workstream 2) and
adjacent security frameworks (CSA AICM, OWASP LLM Top 10, NIST AI RMF,
MITRE ATLAS).

The wizards are built on the whitepaper's five-layer schema:

| Layer | Name | Accountable persona (per §3.1) |
|---|---|---|
| **L1** | AI Business & Usage | AI System Users · AI System Governance |
| **L2** | AI Information | Data Provider |
| **L3** | AI Application | Application Developer (+ Agentic Platform Provider) |
| **L4** | AI Platform | Cloud / AI Platform Provider (+ AI Model Serving) |
| **L5** | AI Model Provider | Model Provider |

The framework is an **accountability** framework — it answers *who* owns
each component across the AI stack. It complements rather than replaces
control frameworks: NIST AI RMF defines *what* governance outcomes to
achieve, ISO/IEC 42001 defines *how* to manage an AI management system,
and EU AI Act defines *which* regulatory obligations apply by risk tier.

No build step. No database. No tracking. No cookies. No external fonts.
Everything runs in the browser; every wizard self-contains its state in
`localStorage` and offers JSON import / export.

## What's included

| # | Wizard | Path | Status |
|---|--------|------|--------|
| 1 | **AI Security Controls Assessment** — 5-layer posture check with OWASP LLM Top 10 coverage and PDF export | `/wizards/security-controls/` | v1 |
| 2 | **AI Security Controls Assessment (CoSAI AICM variant)** — same engine, AICM-aligned control set, PDF export | `/wizards/controls-assessment/` | v1 |
| 3 | **Layer Integration Matrix** — RACI across the five SRF layers (AI Business & Usage / AI Information / AI Application / AI Platform / AI Model Provider) plus CRISP-ML(Q) lifecycle and AI-specific coverage gaps | `/wizards/layer-matrix/` | v1.1 |
| 4 | **CoSAI SRF Stress Test** — walk a real incident through the five layers and find accountability gaps | `/wizards/srf-stress/` | v1.1 |
| 5 | **AI Regulation Discovery Wizard** — 4-step scoping flow that identifies which regulations apply (EU AI Act, GDPR, NIST AI RMF, ISO 42001, SR 11-7, FDA AI/ML, HIPAA, PCI DSS, SOC 2, Colorado AI Act, UK ATRS, …) and surfaces priority controls grouped by SRF layer, with PDF export | `/wizards/regulation-discovery/` | v1 |

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
| Embeddable | Drop-in standalone, `<iframe>`, or ES-module import — see [`docs/EMBEDDING.md`](./docs/EMBEDDING.md). |

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

  * [`CONTRIBUTING.md`](./CONTRIBUTING.md) — DCO, development workflow, CLA placeholder
  * [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) — Contributor Covenant 2.1
  * [`SECURITY.md`](./SECURITY.md) — responsible disclosure
