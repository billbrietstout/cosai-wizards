# CoSAI Wizards: Donation One-Pager

**What:** Five self-contained HTML wizards that implement the CoSAI
frameworks (Shared Responsibility, AI Security Controls) as guided,
no-login self-assessments with printable / exportable results, plus a
governance-landscape explorer that maps statutes, standards, threat
catalogs, and engineering artefacts onto the SRF.

**Offer:** Donate the code and maintenance to the Coalition for Secure AI as
an OASIS Open Project community resource.

## Why it helps CoSAI

- **Lowers the barrier** to applying CoSAI frameworks. Readers go from
  "read the PDF" to "complete the assessment" in a single session.
- **Neutral and auditable.** No tracking, no accounts, no vendor pitch.
  Runs on a single HTML file; anyone can read the source in one sitting.
- **Portable.** Drops into `coalitionforsecureai.org` as static files, an
  iframe widget, or an ES-module: whichever fits CoSAI's current CMS.
- **Owned by the community.** Apache-2.0; CLA / DCO ready.

## What's in v1 (ready now)

| Wizard                                | Outcome                                             |
| ------------------------------------- | --------------------------------------------------- |
| Security Controls Wizard              | Per-area score, top gaps, PDF and JSON export       |
| CoSAI AI Security Controls Assessment | Coverage across L1–L5 layers with printable summary |

## What's in v1.1 (6–8 weeks after donation)

| Wizard                   | Outcome                                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| SRF Stress Test          | Shared Responsibility Framework decision stress test                                                |
| Layer Integration Matrix | Seven enterprise-security domains × CoSAI SRF five layers, RACI cells, §A.1.1 gaps closed overlay   |
| AI Policy Pyramid        | Five-tier governance map (Law → Standards → CoSAI SRF anchor → Threat catalogs → Artefacts) with six worked AI use cases cross-walked end-to-end |

## Non-goals (intentionally)

- **No backend.** The project never collects user responses server-side.
- **No tracking.** No analytics scripts, no cookies, no remote fonts.
- **No vendor content.** Wizards reference only authoritative sources
  (NIST, ISO, CIS, DISA, OWASP, CISA, NACD, CoSAI).

## Technical summary

- Vanilla HTML / CSS / JS; **zero build step**.
- Dependencies: **jsPDF** (MIT), self-hosted, SHA-256 pinned.
- Accessibility: keyboard, focus, ARIA, reduced-motion, contrast ≥ 4.5:1.
- Tested: Pa11y, Lighthouse (Best Practices + SEO ≥ 90), gitleaks secret scan.
- Internationalization-ready: wizard content lives in `data.json` per wizard.

## Donation mechanics

- License: **Apache-2.0** (same for code and data).
- Contributions: **DCO sign-off** on every commit; CLA available on request.
- Transfer options:
  - **Repo transfer** from `billbrietstout/cosai-wizards` into a CoSAI /
    OASIS GitHub org (preserves history, auto-redirects), or
  - **Mirror + fork**: your org forks; I keep a mirror for six months.
- Maintainer handoff: 6-month co-maintenance, then full CoSAI ownership.

## Proposed contact

Bill Stout · `aireadiness@vstout.com` · GitHub `billbrietstout`
