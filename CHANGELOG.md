# Changelog

## [1.7.1](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.7.0...v1.7.1) (2026-06-18)


### Bug Fixes

* **dashboard:** show category label in bar chart tooltips ([#101](https://github.com/sethbacon/terraform-state-manager-frontend/issues/101)) ([16e583d](https://github.com/sethbacon/terraform-state-manager-frontend/commit/16e583d0617024bb9d226b7851d79fb262529840))

## [1.7.0](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.6.1...v1.7.0) (2026-06-18)


### Features

* **drift:** app-registration auth option for Azure DevOps CI sources ([#97](https://github.com/sethbacon/terraform-state-manager-frontend/issues/97)) ([11bd06c](https://github.com/sethbacon/terraform-state-manager-frontend/commit/11bd06c5761aa1622b4c7eb1aa071be7c7fed257))
* **drift:** GitHub App auth option for GitHub CI sources ([#98](https://github.com/sethbacon/terraform-state-manager-frontend/issues/98)) ([c5da4ee](https://github.com/sethbacon/terraform-state-manager-frontend/commit/c5da4eec08bd2d95c81d449b6f36719cb7221370))


### Bug Fixes

* name current tab so suite switcher reuses one sibling tab ([#95](https://github.com/sethbacon/terraform-state-manager-frontend/issues/95)) ([23a014f](https://github.com/sethbacon/terraform-state-manager-frontend/commit/23a014fc2b46a622b875656a56561cab301d4d31))


### Documentation

* add frontend companion documentation ([#100](https://github.com/sethbacon/terraform-state-manager-frontend/issues/100)) ([70910aa](https://github.com/sethbacon/terraform-state-manager-frontend/commit/70910aa68fbb49700a36dda8aed17f48d60e9c06))
* correct README tech-stack and deployment notes ([#99](https://github.com/sethbacon/terraform-state-manager-frontend/issues/99)) ([2bdd7b4](https://github.com/sethbacon/terraform-state-manager-frontend/commit/2bdd7b4b6adf3287a48ffdcf35e34df1665576b2))

## [1.6.1](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.6.0...v1.6.1) (2026-06-17)


### Bug Fixes

* **nav:** use the document icon for API Docs to match the registry ([#93](https://github.com/sethbacon/terraform-state-manager-frontend/issues/93)) ([32f4ba5](https://github.com/sethbacon/terraform-state-manager-frontend/commit/32f4ba5b767c0a08f5c8e5dd33ae7266f8109007))

## [1.6.0](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.5.0...v1.6.0) (2026-06-17)


### Features

* **login:** match the registry login form and use "Logout" wording ([#90](https://github.com/sethbacon/terraform-state-manager-frontend/issues/90)) ([ad17be9](https://github.com/sethbacon/terraform-state-manager-frontend/commit/ad17be9a730dc903ba7d781298e19a60f075f1e0))


### Bug Fixes

* **api-docs:** apply CSP nonce to Swagger UI override styles ([#92](https://github.com/sethbacon/terraform-state-manager-frontend/issues/92)) ([c65963b](https://github.com/sethbacon/terraform-state-manager-frontend/commit/c65963b61a6ecb46f206bba7e4976cbb3faf0515))

## [1.5.0](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.4.1...v1.5.0) (2026-06-17)


### Features

* **suite:** module freshness badges in the "Modules in use" tab (P2-5) ([#88](https://github.com/sethbacon/terraform-state-manager-frontend/issues/88)) ([385da6c](https://github.com/sethbacon/terraform-state-manager-frontend/commit/385da6c6ba758a8ce62c9669474edeb49e3d0081))


### Bug Fixes

* restore Swagger UI info-header hiding and dark scheme theming ([#89](https://github.com/sethbacon/terraform-state-manager-frontend/issues/89)) ([d10f380](https://github.com/sethbacon/terraform-state-manager-frontend/commit/d10f3802a4f299a96f68f3c5c6633ed4e3c599e8))
* **switcher:** reuse one sibling tab + move the icon left of the nav title ([#86](https://github.com/sethbacon/terraform-state-manager-frontend/issues/86)) ([847d0b0](https://github.com/sethbacon/terraform-state-manager-frontend/commit/847d0b049c69750d26c08318803228e3dc63ad4c))

## [1.4.1](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.4.0...v1.4.1) (2026-06-16)


### Bug Fixes

* **csp:** make the per-request nonce reach emotion so styles aren't blocked ([#84](https://github.com/sethbacon/terraform-state-manager-frontend/issues/84)) ([816f3d7](https://github.com/sethbacon/terraform-state-manager-frontend/commit/816f3d71392e424586889c1b59f19788967f3e1d))

## [1.4.0](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.3.0...v1.4.0) (2026-06-16)


### Features

* **setup:** first-run setup wizard frontend ([#81](https://github.com/sethbacon/terraform-state-manager-frontend/issues/81)) ([03d936b](https://github.com/sethbacon/terraform-state-manager-frontend/commit/03d936b2c9727d34d63776e7d3dee79d9c2594fd))

## [1.3.0](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.2.0...v1.3.0) (2026-06-15)


### Features

* add a "Modules in use" tab to state detail ([#76](https://github.com/sethbacon/terraform-state-manager-frontend/issues/76)) ([3cca100](https://github.com/sethbacon/terraform-state-manager-frontend/commit/3cca100afabe118c7b3c5af91d889877ebe9b764))
* **health-lab:** auto-fill registry host from the connected registry ([#78](https://github.com/sethbacon/terraform-state-manager-frontend/issues/78)) ([af5b027](https://github.com/sethbacon/terraform-state-manager-frontend/commit/af5b0276e5b342a4eff5948f3243af790973368b))

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
