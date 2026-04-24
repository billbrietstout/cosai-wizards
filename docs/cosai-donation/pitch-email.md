# CoSAI outreach email (draft)

Intended recipient: CoSAI leadership / maintainers (address TBD: try
`info@coalitionforsecureai.org` first, then open a GitHub Discussion on the
CoSAI OASIS repo if no response in ~1 week).

---

**Subject:** Donation offer: open-source CoSAI wizards (HTML, Apache-2.0)

Hello CoSAI team,

I've been building a set of self-contained, zero-backend HTML wizards that
help practitioners walk through the CoSAI frameworks (the Shared
Responsibility Framework and AI security controls) and produce a
downloadable result (PDF, plus exportable JSON).
They run as plain HTML files, with no database, no tracking, and no account
required.

I would like to **donate** this work to CoSAI so the Coalition can host it
on `coalitionforsecureai.org` (or the OASIS Open Project repository) as a
community-maintained resource.

**What's included, v1 (ready now):**

- **Security Controls Wizard**: guided self-assessment mapped to CoSAI
  AI security controls, exportable as PDF.
- **CoSAI AI Security Controls Assessment**: layered (L1–L5) control
  coverage check with a printable summary.

**Follow-ups (v1.1):**

- SRF Stress Test
- Layer Integration Matrix
- AI Policy Pyramid: governance-landscape explorer (Law → Standards → CoSAI SRF anchor → Threat catalogs → Engineering artefacts) with six worked AI use cases

**Technical properties relevant to donation:**

- **License:** Apache-2.0 (single license across code and data).
- **Provenance:** original authorship; no third-party code other than
  **jsPDF** (MIT), self-hosted with SHA-256 pinned.
- **Zero runtime dependencies** on external services: no CDN fetches,
  no fonts pulled from Google, no analytics, no cookies.
- **Accessibility:** keyboard navigable, visible focus, ARIA on grouped
  inputs, `prefers-reduced-motion` respected; Pa11y clean.
- **Printable:** `@media print` rules ensure each wizard's output is a
  useful hand-off document.
- **Integration paths:** ships with three drop-in options: standalone
  single-file HTML, iframe snippet with `postMessage` auto-resize, and
  an ES-module web component (v1.1).
- **IP hygiene:** all commits are **DCO sign-off** (`git commit -s`),
  ready for OASIS-style contribution rules. Happy to sign a CLA if CoSAI
  prefers.

**Demo URL:** `https://billbrietstout.github.io/cosai-wizards/`
**Repository:** `https://github.com/billbrietstout/cosai-wizards`

**Proposed next steps:**

1. 15-minute walkthrough call (I can show the two v1 wizards end-to-end).
2. CoSAI reviews fit, branding, and any framework-language alignment
   changes you'd like.
3. I address feedback in the repo.
4. We pick a donation path:
   - transfer the repo to `coalitionforsecureai` on GitHub, or
   - have CoSAI fork under your org, with me as a co-maintainer for the
     first 6 months to support the transition.

The goal is to make CoSAI's frameworks **usable in ten minutes** by anyone
(a governance lead, a security engineer, an auditor) without asking them to
create an account, spin up a service, or share data with a third party.
I'd be proud to see it live under the CoSAI banner.

Thank you for considering it. Happy to move at whatever pace works.

Best,
Bill Stout
`aireadiness@vstout.com`
