<!-- markdownlint-disable MD024 -->

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v0.3.0...v0.4.0) (2026-06-08)


### Features

* **drift:** add drift events page with list, filters, and nav entry ([#49](https://github.com/sethbacon/terraform-state-manager-frontend/issues/49)) ([168682d](https://github.com/sethbacon/terraform-state-manager-frontend/commit/168682d4ad25371bdefce86276c0461e1aab9625))
* **fe:** add 9 locales + DeepL translate tooling for i18n parity ([#46](https://github.com/sethbacon/terraform-state-manager-frontend/issues/46)) ([5697726](https://github.com/sethbacon/terraform-state-manager-frontend/commit/5697726a2ca935963aca6d45599f762dd48879d0)), closes [#30](https://github.com/sethbacon/terraform-state-manager-frontend/issues/30)
* **fe:** add compliance engine selector (custom/opa) [FE-OPA] ([#53](https://github.com/sethbacon/terraform-state-manager-frontend/issues/53)) ([2ab6962](https://github.com/sethbacon/terraform-state-manager-frontend/commit/2ab696213d4a2d804f1a6bba3428dfe7f2f3a27d))
* **fe:** add context help for Drift, Version Drift, OIDC Groups, Audit Logs ([#51](https://github.com/sethbacon/terraform-state-manager-frontend/issues/51)) ([8672400](https://github.com/sethbacon/terraform-state-manager-frontend/commit/86724002dbd92d6352f14bbca8b02ee4f01694ca))
* **fe:** add Terraform version-drift page, nav entry, and API binding ([#47](https://github.com/sethbacon/terraform-state-manager-frontend/issues/47)) ([7413f4b](https://github.com/sethbacon/terraform-state-manager-frontend/commit/7413f4b06d5f04c23430da3db2aaf673c332e7bd))
* **fe:** apply DB-configurable ui_theme white-label in ThemeContext ([#42](https://github.com/sethbacon/terraform-state-manager-frontend/issues/42)) ([d835a46](https://github.com/sethbacon/terraform-state-manager-frontend/commit/d835a46ec5c28e1029d058a5c3e1d5a582c8d0ae)), closes [#31](https://github.com/sethbacon/terraform-state-manager-frontend/issues/31)
* **fe:** i18n-key all feature pages [FE-7] ([#52](https://github.com/sethbacon/terraform-state-manager-frontend/issues/52)) ([6552434](https://github.com/sethbacon/terraform-state-manager-frontend/commit/65524342cb749c71bafc136c5800841e7c8e6658)), closes [#34](https://github.com/sethbacon/terraform-state-manager-frontend/issues/34) [#35](https://github.com/sethbacon/terraform-state-manager-frontend/issues/35) [#36](https://github.com/sethbacon/terraform-state-manager-frontend/issues/36)
* **nav:** rename Dashboard→Home, Workspaces→State Files, regroup under State Management/Identity ([#55](https://github.com/sethbacon/terraform-state-manager-frontend/issues/55)) ([a0c4928](https://github.com/sethbacon/terraform-state-manager-frontend/commit/a0c49286eab295e8644146bd5d6a722c060d048c))


### Bug Fixes

* **fe:** top-nav settings/help/about parity, left-nav reorg, role-templates page error ([#45](https://github.com/sethbacon/terraform-state-manager-frontend/issues/45)) ([aaa5c8f](https://github.com/sethbacon/terraform-state-manager-frontend/commit/aaa5c8f51bcfa831bfe63728636ce168b325b0f8))
* **nav:** make all left-nav category sections collapsible ([#50](https://github.com/sethbacon/terraform-state-manager-frontend/issues/50)) ([496e453](https://github.com/sethbacon/terraform-state-manager-frontend/commit/496e453e6068c0854d620f7f55c03b6817ebc1a3))


### Refactor

* **fe:** add shared &lt;Page&gt; wrapper and migrate pages to it ([#57](https://github.com/sethbacon/terraform-state-manager-frontend/issues/57)) ([bc74932](https://github.com/sethbacon/terraform-state-manager-frontend/commit/bc749329597f1979ce97b710c88d56f99afd4bc6))
* **fe:** standardize feature-page headers via shared PageHeader ([#56](https://github.com/sethbacon/terraform-state-manager-frontend/issues/56)) ([1c411fc](https://github.com/sethbacon/terraform-state-manager-frontend/commit/1c411fc232fd113400ddb7225949799f8f23a74c))
* **nav:** move API Docs to the top under Home ([#58](https://github.com/sethbacon/terraform-state-manager-frontend/issues/58)) ([08efefc](https://github.com/sethbacon/terraform-state-manager-frontend/commit/08efefcd4d1ab95d5e615e27000ae362d5376bdb))

## [0.3.0](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v0.2.0...v0.3.0) (2026-06-07)


### Features

* **fe:** add cmdk command palette wired into Layout ([#40](https://github.com/sethbacon/terraform-state-manager-frontend/issues/40)) ([9ca0a3b](https://github.com/sethbacon/terraform-state-manager-frontend/commit/9ca0a3b0a7d46a7578e70ab6916842e998a07578)), closes [#32](https://github.com/sethbacon/terraform-state-manager-frontend/issues/32)
* **fe:** port icon system (FontAwesome + simple-icons) ([#38](https://github.com/sethbacon/terraform-state-manager-frontend/issues/38)) ([4c7db61](https://github.com/sethbacon/terraform-state-manager-frontend/commit/4c7db6127463f81145aca30211d11d6c6e155d4b))
* **fe:** wire accessibility (jsx-a11y, axe, RouteFocusManager) [FE-6] ([#41](https://github.com/sethbacon/terraform-state-manager-frontend/issues/41)) ([91a9690](https://github.com/sethbacon/terraform-state-manager-frontend/commit/91a9690fa589a8362b94628227c4979de086fb65)), closes [#33](https://github.com/sethbacon/terraform-state-manager-frontend/issues/33)

## [0.2.0](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v0.1.0...v0.2.0) (2026-06-07)


### Features

* identity 1:1 frontend (F0–F5) ([#23](https://github.com/sethbacon/terraform-state-manager-frontend/issues/23)) ([c6b118c](https://github.com/sethbacon/terraform-state-manager-frontend/commit/c6b118c005221f6bf41d0cc953a1c68ffe61c1c7))
* port i18n, config, hooks, and ThemeContext from registry (F0) ([#21](https://github.com/sethbacon/terraform-state-manager-frontend/issues/21)) ([ad86eae](https://github.com/sethbacon/terraform-state-manager-frontend/commit/ad86eae2b1f90ddd9c1a7671f3c8c4b5734af509))


### Bug Fixes

* **app:** wrap the app in QueryClientProvider ([#26](https://github.com/sethbacon/terraform-state-manager-frontend/issues/26)) ([491822c](https://github.com/sethbacon/terraform-state-manager-frontend/commit/491822c01d2ef32129d24b32bfcb597bb09544ff))
* **deploy:** make dev OIDC seed compatible with the canonical identity schema ([#25](https://github.com/sethbacon/terraform-state-manager-frontend/issues/25)) ([3401348](https://github.com/sethbacon/terraform-state-manager-frontend/commit/34013480524237a9a1d3e26326d514e2dc15c7ff))

## [Unreleased]

---

## [0.1.0] - 2026-03-04

- Initial commit
