# Licensing

This repository is a multi-package workspace. Different packages are licensed differently on purpose. See [ADR-0005](apps/native-rd/docs/decisions/ADR-0005-licensing-and-trademark.md) for the full rationale.

## Per-package licenses

| Package                    | License           | LICENSE file                                                           | Why                                                                                          |
| -------------------------- | ----------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `packages/openbadges-core` | **Apache-2.0**    | [`packages/openbadges-core/LICENSE`](packages/openbadges-core/LICENSE) | Standards-implementation code. Permissive, with explicit patent grant.                       |
| `packages/design-tokens`   | **MIT**           | [`packages/design-tokens/LICENSE`](packages/design-tokens/LICENSE)     | Design tokens. Maximally permissive.                                                         |
| `apps/native-rd`           | **AGPL-3.0-only** | [`apps/native-rd/LICENSE`](apps/native-rd/LICENSE)                     | Differentiated product. Strong copyleft: any commercial fork or SaaS clone must remain open. |

The root `package.json` is a private, unpublished workspace meta-package. Its `license` field and the root [`LICENSE`](LICENSE) file both say **AGPL-3.0-only** (the dominant product license) so GitHub's license detector can populate the repository's license metadata. That root declaration does not change any package's license: the per-package `LICENSE` files above are authoritative for the code they cover.

## Copyright

Copyright © 2026 Joe Czarnecki. Sole copyright holder as of 2026-05-14.

## Contributing

To preserve the option to dual-license `apps/native-rd` (and any future AGPL'd packages) in the future — e.g., to offer a commercial license to institutions that cannot accept AGPL — **all contributions to AGPL-licensed components must include a Developer Certificate of Origin (DCO) sign-off.**

In practice: sign your commits with `git commit -s`. This appends a line like:

```
Signed-off-by: Your Name <you@example.com>
```

By signing off you assert that you have the right to submit the contribution under the project's license, per the terms of [https://developercertificate.org/](https://developercertificate.org/).

A CI check enforces this on pull requests touching AGPL-licensed components. See [`.github/workflows/dco.yml`](.github/workflows/dco.yml).

Contributions to MIT- or Apache-licensed packages also benefit from DCO sign-off but it is not strictly required to relicense them later.

## Trademark

**"Rollercoaster.dev"**, the rollercoaster.dev logo, and the app name are trademarks of Joe Czarnecki (™). Registered trademark filings (®) are in progress. Permission is not granted by the code licenses above to use these names or marks; see Apache-2.0 § 6 and Trademark Law generally.

Forks may use the code under the applicable license. Forks **may not** publish to the App Store, Google Play, or elsewhere under the names "Rollercoaster.dev", "Rollercoaster", or any confusingly similar name or logo without prior written permission.

## SPDX identifiers

Source files may include an SPDX identifier in a header comment, e.g.:

```ts
// SPDX-FileCopyrightText: 2026 Joe Czarnecki
// SPDX-License-Identifier: AGPL-3.0-only
```

SPDX headers are optional, not required. The package's LICENSE file is authoritative regardless of whether a given source file carries a header.

## Future-state notes

- If a sync server package is added under `packages/`, it will also be **AGPL-3.0-only**, for the reasons in ADR-0005.
- If the project incorporates code from contributors who have not provided a DCO sign-off, the dual-licensing path for that code is foreclosed until they re-grant rights. The DCO CI check exists to prevent this from happening accidentally.

## Questions

Open a GitHub Discussion or contact joe.czar (at) outlook.com.
