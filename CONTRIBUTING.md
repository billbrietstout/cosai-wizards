# Contributing

Thanks for considering a contribution. This project is intentionally
small and vanilla — the bar for adding dependencies or tooling is high.

## Ground rules

  * **No dependencies at runtime.** No frameworks, no bundlers, no CDNs.
    Self-host anything that has to ship.
  * **Accessibility ≥ WCAG 2.2 AA.** Keyboard navigation, visible focus,
    ARIA on custom controls, respect `prefers-reduced-motion`.
  * **No tracking.** No analytics, no cookies, no external fonts, no
    network calls from the wizards at runtime.
  * **Diffable.** For wizards under `/wizards/security-controls/` and
    `/wizards/controls-assessment/`, keep the originals in
    `wizards-raw/` alongside the rewritten multi-file version so the
    port can be audited.

## Licensing and provenance

All contributions are licensed under the
[Apache License, Version 2.0](./LICENSE).

### Developer Certificate of Origin (DCO)

Every commit must be signed off to indicate you wrote the change or have
the right to submit it under the Apache-2.0 license. Sign off with:

```bash
git commit -s -m "feat(wizard): add export button"
```

The `-s` appends a line:

```
Signed-off-by: Your Name <your.email@example.com>
```

By signing off you assert the terms of the Developer Certificate of
Origin 1.1 ([developercertificate.org](https://developercertificate.org/)).

### Contributor License Agreement (placeholder)

Once this project is accepted by the Coalition for Secure AI (CoSAI),
contributors will be asked to sign the CoSAI CLA in addition to the DCO
sign-off. A notice will be added here when the CLA is live; until then,
the DCO sign-off is sufficient.

## Development workflow

1. Fork and branch off `main`.
2. Keep commits small and scoped (one logical change per commit).
3. Sign every commit (`git commit -s`).
4. Run `npx html-validate index.html "wizards/**/index.html"` locally
   if you can (same config as CI).
5. Open a pull request. Ensure CI passes: `html-validate`, `lychee`,
   `pa11y`, Lighthouse, and the gitleaks secret scan.

## Commit message style

Short, lower-case, [Conventional Commits](https://www.conventionalcommits.org/)
prefix (`feat:`, `fix:`, `chore:`, `docs:`, `ci:`, `refactor:`,
`test:`). A `(scope)` is welcome (e.g. `feat(security-controls): …`).

## What kinds of changes are welcome?

  * New questions, controls, or reference sources — please cite the
    source URL in the `data.json` entry.
  * Accessibility and printability improvements.
  * Translations (file an issue first so we can plan the locale story).
  * Bug fixes and documentation.

Before proposing a new wizard, open a discussion describing the scope —
we want to keep the suite focused and the UI predictable.

## Reporting security issues

See [`SECURITY.md`](./SECURITY.md).
