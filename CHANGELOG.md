# Changelog

## [1.2.0](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.1.0...v1.2.0) (2026-06-14)


### Features

* **suite:** note possible re-auth when opening the sibling app ([#74](https://github.com/sethbacon/terraform-state-manager-frontend/issues/74)) ([c0152bd](https://github.com/sethbacon/terraform-state-manager-frontend/commit/c0152bd89af0761e6bf22b943a301fcfd6c2baa3))

## [1.1.0](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.0.1...v1.1.0) (2026-06-13)


### Features

* add suite app-switcher ([#73](https://github.com/sethbacon/terraform-state-manager-frontend/issues/73)) ([317ffec](https://github.com/sethbacon/terraform-state-manager-frontend/commit/317ffec505c07b2aee04c778a5005d3f9ab89ef7))
* upgrade MUI to v9 ([#65](https://github.com/sethbacon/terraform-state-manager-frontend/issues/65)) ([d483895](https://github.com/sethbacon/terraform-state-manager-frontend/commit/d483895ccc5694452c8a1cd38f3ff2de685a351e))


### Bug Fixes

* harden frontend image and add CSP headers ([#67](https://github.com/sethbacon/terraform-state-manager-frontend/issues/67)) ([8f6f15d](https://github.com/sethbacon/terraform-state-manager-frontend/commit/8f6f15dd82a1139cc1b1b3d8e85832f42d746398))

## [1.0.1](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.0.0...v1.0.1) (2026-06-12)


### Documentation

* add Apache-2.0 LICENSE, NOTICE attributions, and license/disclaimer sections ([#62](https://github.com/sethbacon/terraform-state-manager-frontend/issues/62)) ([7822fe3](https://github.com/sethbacon/terraform-state-manager-frontend/commit/7822fe34f81069c08a16c020e62a5f49cc67ec5b))

## [1.0.0](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v0.5.0...v1.0.0) (2026-06-12)


### chore

* release 1.0.0 ([3c3234b](https://github.com/sethbacon/terraform-state-manager-frontend/commit/3c3234b94249085e924127ddb91ce6abce2c7d6f))

## [0.5.0](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v0.4.0...v0.5.0) (2026-06-12)


### Features

* add i18n scaffold + CSP-nonce emotion cache (Phase A) ([0243d3a](https://github.com/sethbacon/terraform-state-manager-frontend/commit/0243d3aa8599b5e96a1ccce7bbb2c385f037ea3b))
* Administration area — collapsible group + identity pages (Phase D) ([3e2d845](https://github.com/sethbacon/terraform-state-manager-frontend/commit/3e2d84518d461fac140464ee2829cdb398e5c5cc))
* API documentation page (swagger-ui-react) (Phase B) ([bd7a2df](https://github.com/sethbacon/terraform-state-manager-frontend/commit/bd7a2dff11f91cc0a192dc6eadc5cfe64462057b))
* app-shell parity — collapsible nav, settings/locale, About, Help, ⌘K (Phase A) ([28ba245](https://github.com/sethbacon/terraform-state-manager-frontend/commit/28ba245cbb6d0b5fcf6e9dda6b8052b1827f86c1))
* ConfirmDialog on destructive actions (Phase A) ([85930b9](https://github.com/sethbacon/terraform-state-manager-frontend/commit/85930b9f5a51de3b1647bc1761e8d1b7aa7fd21a))
* **dashboard:** per-source sync freshness from the analysis store ([81cb66d](https://github.com/sethbacon/terraform-state-manager-frontend/commit/81cb66d077a5538ce94303349ad74c8c9535ce03))
* Notifications page — manage alert channels ([4850996](https://github.com/sethbacon/terraform-state-manager-frontend/commit/4850996360d998e69add9a6be59538d9bcf7bb28))
* rich chart-driven Home page (Phase C) ([5a14461](https://github.com/sethbacon/terraform-state-manager-frontend/commit/5a14461ba11cdcf9d6b515c845fab632437dcaa2))
* Schedules page — manage recurring drift runs ([3bb00fc](https://github.com/sethbacon/terraform-state-manager-frontend/commit/3bb00fc087be12669b754fbba8865e96eb8e5375))
* **sources:** edit dialog and test-connection action on source cards ([191c57d](https://github.com/sethbacon/terraform-state-manager-frontend/commit/191c57d58627a5c79675c0b4d6eda31322121028))
* **sources:** Outputs tab + download menu ([5fa787f](https://github.com/sethbacon/terraform-state-manager-frontend/commit/5fa787f277d2fdffb0f41398e739ba6d97f7a47a))
* **sources:** state-file count chip on source cards ([9d61a00](https://github.com/sethbacon/terraform-state-manager-frontend/commit/9d61a004fd705bf31884881dd49e6a8900dd00e9))
* SSO login surfacing (SAML/LDAP) + admin SSO page ([1c8d0a6](https://github.com/sethbacon/terraform-state-manager-frontend/commit/1c8d0a6436c536f186dbbfb8f670ca88d25fe27f))
* **transfer:** backend-specific target guidance ([748678f](https://github.com/sethbacon/terraform-state-manager-frontend/commit/748678fa2ed63238743b03edcbf28f76f6c8f8c9))
* wire i18n through page bodies — completes Phase A ([3078c01](https://github.com/sethbacon/terraform-state-manager-frontend/commit/3078c011b4df0b51779390ef921cef16001ec068))


### Bug Fixes

* copy .npmrc in frontend Dockerfile so npm ci resolves deps ([c1c471d](https://github.com/sethbacon/terraform-state-manager-frontend/commit/c1c471d690dda60115ade9aa99eed9d31fd73183))
* refresh stale parent data after dialog mutations ([0d37f51](https://github.com/sethbacon/terraform-state-manager-frontend/commit/0d37f51fb683964d19e9ab8880653830ad4e7876))


### Refactor

* **ux:** theme parity + reduced-motion a11y + uniform page headers ([366ba91](https://github.com/sethbacon/terraform-state-manager-frontend/commit/366ba91e87545a63bd8c9d1a841fc56c715a21b8))
