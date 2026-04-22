# Security Policy

## Scope

This repository ships static HTML / CSS / JS wizards. There is no backend,
no server-side state, and no authentication. The realistic risk surface is:

  * Cross-site scripting via user-imported JSON state.
  * Supply-chain tampering with the vendored `jspdf.umd.min.js`.
  * Content spoofing via a malicious fork hosted elsewhere.

## Supported versions

Only the `main` branch is supported. Once the project is donated to CoSAI,
this section will describe the accepted-release cadence.

## Reporting a vulnerability

Please **do not open a public issue** for suspected vulnerabilities.

  1. Open a private [GitHub Security Advisory](https://github.com/billbrietstout/cosai-wizards/security/advisories/new)
     on this repository, **or**
  2. Email the maintainer with a clear reproduction and the branch /
     commit SHA.

You should receive acknowledgement within **5 business days**. We aim to
publish a fix (or a documented mitigation) within **30 days** of
acknowledgement for issues we can reproduce.

## Third-party components

The only bundled third-party runtime dependency is
[jsPDF](https://github.com/parallax/jsPDF) 2.5.1, served locally from
`/shared/vendor/jspdf.umd.min.js`. The expected SHA-256 is pinned in
[`NOTICE`](./NOTICE):

```
98ccf17aa10c20bb1301762618fcc9b6ab3a4e7f26b6071d64d0b41154df3875
```

If you are redistributing this project, verify the hash matches before
publishing. The GitHub Actions `secret-scan` workflow runs `gitleaks`
over full history (`fetch-depth: 0`) to guard against accidental
credential exposure.

## Privacy

The wizards never transmit user inputs. State is persisted in
`localStorage` on the viewer's own device and can be deleted by clearing
site data. JSON export / import is client-only.
