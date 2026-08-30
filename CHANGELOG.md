# Changelog

## [1.28.0](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.27.0...v1.28.0) (2026-08-30)


### Features

* **auth:** accept the session's remaining lifetime from /auth/me ([#395](https://github.com/sethbacon/terraform-state-manager-frontend/issues/395)) ([a7ea73b](https://github.com/sethbacon/terraform-state-manager-frontend/commit/a7ea73b4190d6bee9fb487308ad6a3b972a19d8e))

## [1.27.0](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.26.4...v1.27.0) (2026-08-28)


### Features

* **identity:** offer a platform administrator the organization picker ([#392](https://github.com/sethbacon/terraform-state-manager-frontend/issues/392)) ([904d48b](https://github.com/sethbacon/terraform-state-manager-frontend/commit/904d48b5d538fa665f2995d5275844b010f2c98c))

## [1.26.4](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.26.3...v1.26.4) (2026-08-28)


### Bug Fixes

* **ci:** stop piping into grep -q, which dies 141 under pipefail ([#390](https://github.com/sethbacon/terraform-state-manager-frontend/issues/390)) ([2476c37](https://github.com/sethbacon/terraform-state-manager-frontend/commit/2476c3763e947f030a7a37b62767d403911583b9))

## [1.26.3](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.26.2...v1.26.3) (2026-08-28)


### Bug Fixes

* **ci:** give translation PRs the CI every other PR gets ([#387](https://github.com/sethbacon/terraform-state-manager-frontend/issues/387)) ([a3e39b1](https://github.com/sethbacon/terraform-state-manager-frontend/commit/a3e39b11f960ed80b754dfbea4342a11b57704b8)), closes [#379](https://github.com/sethbacon/terraform-state-manager-frontend/issues/379)
* **ci:** tell a broken OSV scanner from a clean one ([#385](https://github.com/sethbacon/terraform-state-manager-frontend/issues/385)) ([5f41e02](https://github.com/sethbacon/terraform-state-manager-frontend/commit/5f41e02291b172d37ae01dad4efa7d6ac037e2ac))
* **ci:** test the resolved YAML value, not the workflow source text ([#388](https://github.com/sethbacon/terraform-state-manager-frontend/issues/388)) ([5b17dcf](https://github.com/sethbacon/terraform-state-manager-frontend/commit/5b17dcf93ad53369dd2fa20a4c41d89b0c2cd122))

## [1.26.2](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.26.1...v1.26.2) (2026-08-26)


### Bug Fixes

* **docker:** render the nginx upstream from BACKEND_URL ([#381](https://github.com/sethbacon/terraform-state-manager-frontend/issues/381)) ([2b328b3](https://github.com/sethbacon/terraform-state-manager-frontend/commit/2b328b3041c6725da83e833a6861efe2fb195a87))

## [1.26.1](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.26.0...v1.26.1) (2026-08-25)


### Bug Fixes

* **i18n:** give nb registryHostField the host word it lost in the split ([#378](https://github.com/sethbacon/terraform-state-manager-frontend/issues/378)) ([0dd6c49](https://github.com/sethbacon/terraform-state-manager-frontend/commit/0dd6c491c5fdf215e99648e2910b0d1ed87deda6))
* **i18n:** split the colliding versionLab.registryHost key, which mislabelled the run detail ([#375](https://github.com/sethbacon/terraform-state-manager-frontend/issues/375)) ([2e1f2c5](https://github.com/sethbacon/terraform-state-manager-frontend/commit/2e1f2c51b738bd67930d20cd43becf12d1ebb2aa)), closes [#364](https://github.com/sethbacon/terraform-state-manager-frontend/issues/364)

## [1.26.0](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.25.0...v1.26.0) (2026-08-23)


### Features

* **api:** send the acting organization on every request ([#361](https://github.com/sethbacon/terraform-state-manager-frontend/issues/361)) ([b5e345c](https://github.com/sethbacon/terraform-state-manager-frontend/commit/b5e345cb3bf156163c7127fce55ba04eb6733dbe))
* **shell:** mount the organization picker and remember the choice ([#362](https://github.com/sethbacon/terraform-state-manager-frontend/issues/362)) ([f4e8c17](https://github.com/sethbacon/terraform-state-manager-frontend/commit/f4e8c1740476e9f8bff2bc9091feb40540d167af))


### Bug Fixes

* **ci:** refuse to run signature-replay when Dependabot edited the workflow ([#346](https://github.com/sethbacon/terraform-state-manager-frontend/issues/346)) ([ce14c6d](https://github.com/sethbacon/terraform-state-manager-frontend/commit/ce14c6d8ff62c8f49f7f56c8673b7884a9065e47))


### Documentation

* **security:** record the shared-workflow trust relationship, and fix what it invalidated ([#357](https://github.com/sethbacon/terraform-state-manager-frontend/issues/357)) ([76aa0ef](https://github.com/sethbacon/terraform-state-manager-frontend/commit/76aa0ef24571a21e043b3aaea9a8777789ac7d81))

## [1.25.0](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.24.2...v1.25.0) (2026-08-16)


### Features

* **admin:** add the platform-admin management page ([#334](https://github.com/sethbacon/terraform-state-manager-frontend/issues/334)) ([2da5fd5](https://github.com/sethbacon/terraform-state-manager-frontend/commit/2da5fd5b8f408993024284c5de455cc8675bf880)), closes [#332](https://github.com/sethbacon/terraform-state-manager-frontend/issues/332)

## [1.24.2](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.24.1...v1.24.2) (2026-08-13)


### Documentation

* correct the suite-ui package as public on npmjs ([#323](https://github.com/sethbacon/terraform-state-manager-frontend/issues/323)) ([43be007](https://github.com/sethbacon/terraform-state-manager-frontend/commit/43be0076b719945a65ebf7cfd8c2bcd09a336322))

## [1.24.1](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.24.0...v1.24.1) (2026-08-12)


### Bug Fixes

* **ci:** spend the replay credential on the one private checkout only ([#318](https://github.com/sethbacon/terraform-state-manager-frontend/issues/318)) ([5424d46](https://github.com/sethbacon/terraform-state-manager-frontend/commit/5424d46113cdfd536677b2f42c980a978870e6ca))


### Refactor

* **sources,drift:** split the two god-components into one module per flow ([#320](https://github.com/sethbacon/terraform-state-manager-frontend/issues/320)) ([5666a03](https://github.com/sethbacon/terraform-state-manager-frontend/commit/5666a0393b898dee585e04b77118818938dcccfc))

## [1.24.0](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.23.4...v1.24.0) (2026-08-12)


### Features

* adopt @4cloudguru/cloud-suite-ui from npmjs ([#311](https://github.com/sethbacon/terraform-state-manager-frontend/issues/311)) ([3fa253c](https://github.com/sethbacon/terraform-state-manager-frontend/commit/3fa253c408bdd4bfb07acbf4e169e39d4e268922))


### Bug Fixes

* **ci:** check out the two ADO extension repos the replay gate requires ([#303](https://github.com/sethbacon/terraform-state-manager-frontend/issues/303)) ([db687a2](https://github.com/sethbacon/terraform-state-manager-frontend/commit/db687a2580a3d6d3d757aa33c654e3603ab79936))
* **ci:** drop the dead GitHub Packages registry from dependabot ([#312](https://github.com/sethbacon/terraform-state-manager-frontend/issues/312)) ([a98df93](https://github.com/sethbacon/terraform-state-manager-frontend/commit/a98df93941a835509fc25468e12daabed43bc82d))
* **ci:** pin the suite-ui attestation signer repo during the bridge ([#310](https://github.com/sethbacon/terraform-state-manager-frontend/issues/310)) ([d7ccd93](https://github.com/sethbacon/terraform-state-manager-frontend/commit/d7ccd9377be93eb379edd308c450b568ca1fd2cc))
* **ci:** point dependabot at the packages secret that exists ([#306](https://github.com/sethbacon/terraform-state-manager-frontend/issues/306)) ([b95ba28](https://github.com/sethbacon/terraform-state-manager-frontend/commit/b95ba287623a386b53af7a63faec3d7652e33f21))
* **ci:** point the suite-ui checkout at its new owner ([#308](https://github.com/sethbacon/terraform-state-manager-frontend/issues/308)) ([9ce273d](https://github.com/sethbacon/terraform-state-manager-frontend/commit/9ce273d4d70d404f19e024e384687704c86267f3))
* **ci:** repair the empty `with:` blocks that broke five workflows at startup ([#301](https://github.com/sethbacon/terraform-state-manager-frontend/issues/301)) ([c848131](https://github.com/sethbacon/terraform-state-manager-frontend/commit/c84813125c30bbc47d9518b3c7d5cb9cb9414b41))
* **ci:** stop dependabot proposing typescript majors ([#313](https://github.com/sethbacon/terraform-state-manager-frontend/issues/313)) ([8362e0f](https://github.com/sethbacon/terraform-state-manager-frontend/commit/8362e0fcb056ac1b390bd76ec5712f736da03f4f))
* **ci:** verify library provenance by owner while its repo move settles ([#309](https://github.com/sethbacon/terraform-state-manager-frontend/issues/309)) ([0990297](https://github.com/sethbacon/terraform-state-manager-frontend/commit/09902972992fb9ddef634155bf1b8f6aeab9e3d2))
* **deps:** patch dompurify and retire the stale react-router exception ([#317](https://github.com/sethbacon/terraform-state-manager-frontend/issues/317)) ([139d786](https://github.com/sethbacon/terraform-state-manager-frontend/commit/139d786a827fed4aa5b3debf5f1b3ad04045cbc4))


### Refactor

* **dashboard:** make EstateOverview typing survive a recharts major ([#316](https://github.com/sethbacon/terraform-state-manager-frontend/issues/316)) ([204874f](https://github.com/sethbacon/terraform-state-manager-frontend/commit/204874fd389c57d5f58caa66f075056a9a6e1959))

## [1.23.4](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.23.3...v1.23.4) (2026-08-08)


### Bug Fixes

* **deployments:** allow the dev stack's IdP through the new egress guard ([#292](https://github.com/sethbacon/terraform-state-manager-frontend/issues/292)) ([9eff866](https://github.com/sethbacon/terraform-state-manager-frontend/commit/9eff866749bff886c5f9a0247413227005b4ca6c))
* **deps:** bump @4cloudguru/cloud-suite-ui to 0.8.1 and verify its provenance ([#293](https://github.com/sethbacon/terraform-state-manager-frontend/issues/293)) ([d522940](https://github.com/sethbacon/terraform-state-manager-frontend/commit/d5229404b22a3ce83a60b79e26ca32b4c2b712b4))
* **deps:** pin nanoid past GHSA-2v37-7h3g-55p8 ([#296](https://github.com/sethbacon/terraform-state-manager-frontend/issues/296)) ([bc88126](https://github.com/sethbacon/terraform-state-manager-frontend/commit/bc8812653567026b7c9235a0d7986b1d4dda1e8d))
* **utils:** compose isSafeExternalUrl on top of the shared isSafeUrl guard ([#290](https://github.com/sethbacon/terraform-state-manager-frontend/issues/290)) ([01bd257](https://github.com/sethbacon/terraform-state-manager-frontend/commit/01bd257acae9b7f573da40056999ed5de777d52a))

## [1.23.3](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.23.2...v1.23.3) (2026-08-05)


### Bug Fixes

* **admin:** stop silently blanking branding on a failed theme load ([#285](https://github.com/sethbacon/terraform-state-manager-frontend/issues/285)) ([91a9e82](https://github.com/sethbacon/terraform-state-manager-frontend/commit/91a9e8241046a9aa335009c27805a8913fd42ead))
* **deployments:** configure state-source roots in the dev stack; patch brace-expansion ([#289](https://github.com/sethbacon/terraform-state-manager-frontend/issues/289)) ([c61d14d](https://github.com/sethbacon/terraform-state-manager-frontend/commit/c61d14d96fd42fca593e59c7de46a677ce939ff9))
* **sources:** give the chip row its own line on source cards ([#282](https://github.com/sethbacon/terraform-state-manager-frontend/issues/282)) ([90fcd0b](https://github.com/sethbacon/terraform-state-manager-frontend/commit/90fcd0b2a427e39cf87be0efbfebfe9ee988dd80)), closes [#281](https://github.com/sethbacon/terraform-state-manager-frontend/issues/281)


### Refactor

* **branding:** render the admin page from the shared card ([#284](https://github.com/sethbacon/terraform-state-manager-frontend/issues/284)) ([3f653d1](https://github.com/sethbacon/terraform-state-manager-frontend/commit/3f653d189fb8d26167c9cce74383bcbb191bd528))

## [1.23.2](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.23.1...v1.23.2) (2026-07-31)


### Bug Fixes

* **deps:** patch brace-expansion and triage the react-router advisory ([#278](https://github.com/sethbacon/terraform-state-manager-frontend/issues/278)) ([2d29894](https://github.com/sethbacon/terraform-state-manager-frontend/commit/2d2989410188deec3a9c748f9b0755cd7f5c1a42))
* log out via CSRF-protected POST instead of a GET navigation ([#280](https://github.com/sethbacon/terraform-state-manager-frontend/issues/280)) ([d8333ac](https://github.com/sethbacon/terraform-state-manager-frontend/commit/d8333acb0b74478a30e3915107b906761fbedb8f))

## [1.23.1](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.23.0...v1.23.1) (2026-07-28)


### Bug Fixes

* **api:** validate analysis/drift/state-edit response shapes at the boundary ([#217](https://github.com/sethbacon/terraform-state-manager-frontend/issues/217)) ([#276](https://github.com/sethbacon/terraform-state-manager-frontend/issues/276)) ([87cce57](https://github.com/sethbacon/terraform-state-manager-frontend/commit/87cce57404ff35dd2e3ab48cf981aea43559b7c8))
* **sources:** show computed draft-vs-current diff in force-overwrite dialog ([#214](https://github.com/sethbacon/terraform-state-manager-frontend/issues/214)) ([#273](https://github.com/sethbacon/terraform-state-manager-frontend/issues/273)) ([fc869ab](https://github.com/sethbacon/terraform-state-manager-frontend/commit/fc869ab692a1135cbd8230cf568d903b99dc3dfc))

## [1.23.0](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.22.0...v1.23.0) (2026-07-28)


### Features

* **frontend:** add axios request timeout with a longer ceiling for heavy ops ([#216](https://github.com/sethbacon/terraform-state-manager-frontend/issues/216)) ([#251](https://github.com/sethbacon/terraform-state-manager-frontend/issues/251)) ([684f02c](https://github.com/sethbacon/terraform-state-manager-frontend/commit/684f02ce8145757731232232ea0b3e13fa912c58))


### Bug Fixes

* add HSTS and tighten CSP (base-uri/form-action/object-src) in nginx ([#208](https://github.com/sethbacon/terraform-state-manager-frontend/issues/208), [#210](https://github.com/sethbacon/terraform-state-manager-frontend/issues/210)) ([#268](https://github.com/sethbacon/terraform-state-manager-frontend/issues/268)) ([c4da80c](https://github.com/sethbacon/terraform-state-manager-frontend/commit/c4da80c5a5007e369368f248a8d055f030609e9f))
* cap drift run summary table render count ([#233](https://github.com/sethbacon/terraform-state-manager-frontend/issues/233)) ([#266](https://github.com/sethbacon/terraform-state-manager-frontend/issues/266)) ([b09a86a](https://github.com/sethbacon/terraform-state-manager-frontend/commit/b09a86ad0b6638afc3d5d4d80fe4a9ddca80d739))
* DriftPage workflow error state, setup token trim, dedup query keys ([#262](https://github.com/sethbacon/terraform-state-manager-frontend/issues/262)) ([7b1578f](https://github.com/sethbacon/terraform-state-manager-frontend/commit/7b1578fa2c85bc2648e4165348d17524b1935458))
* **frontend:** show a correlation id instead of the raw error message in ErrorBoundary ([#234](https://github.com/sethbacon/terraform-state-manager-frontend/issues/234)) ([#258](https://github.com/sethbacon/terraform-state-manager-frontend/issues/258)) ([e2151db](https://github.com/sethbacon/terraform-state-manager-frontend/commit/e2151db2e9d222f9e342c620ab8d0585bba4ac84))
* **frontend:** unify URL validation + stop reflecting attacker error text ([#220](https://github.com/sethbacon/terraform-state-manager-frontend/issues/220), [#221](https://github.com/sethbacon/terraform-state-manager-frontend/issues/221), [#222](https://github.com/sethbacon/terraform-state-manager-frontend/issues/222), [#227](https://github.com/sethbacon/terraform-state-manager-frontend/issues/227)) ([#257](https://github.com/sethbacon/terraform-state-manager-frontend/issues/257)) ([afc927c](https://github.com/sethbacon/terraform-state-manager-frontend/commit/afc927ca260eb288771d9af0fceee54d2a6d8441))
* lock escapeValue:false XSS invariant + document error-scrubbing ([#242](https://github.com/sethbacon/terraform-state-manager-frontend/issues/242), [#245](https://github.com/sethbacon/terraform-state-manager-frontend/issues/245)) ([#267](https://github.com/sethbacon/terraform-state-manager-frontend/issues/267)) ([138e556](https://github.com/sethbacon/terraform-state-manager-frontend/commit/138e556eb275d2a0ed7f50f92076aa91840198f3))
* route dashboard/report refresh through CSRF-safe POST /reconcile ([#215](https://github.com/sethbacon/terraform-state-manager-frontend/issues/215)) ([#272](https://github.com/sethbacon/terraform-state-manager-frontend/issues/272)) ([a6b12f2](https://github.com/sethbacon/terraform-state-manager-frontend/commit/a6b12f2ae05acb010a67b1cf7b19efcd2f42fa81))
* show current server state before force-overwrite on 409 ([#214](https://github.com/sethbacon/terraform-state-manager-frontend/issues/214)) ([#270](https://github.com/sethbacon/terraform-state-manager-frontend/issues/270)) ([61a97f9](https://github.com/sethbacon/terraform-state-manager-frontend/commit/61a97f9ac57edf8e65ecdb8c77d1d1554ee8f43d))
* wire route-level scope guard into App router ([#230](https://github.com/sethbacon/terraform-state-manager-frontend/issues/230), [#237](https://github.com/sethbacon/terraform-state-manager-frontend/issues/237)) ([#263](https://github.com/sethbacon/terraform-state-manager-frontend/issues/263)) ([136580c](https://github.com/sethbacon/terraform-state-manager-frontend/commit/136580c60bdb36e272d48fe918154951162876b2))
* wrap each route page in its own ErrorBoundary ([#217](https://github.com/sethbacon/terraform-state-manager-frontend/issues/217)) ([#269](https://github.com/sethbacon/terraform-state-manager-frontend/issues/269)) ([1eb691f](https://github.com/sethbacon/terraform-state-manager-frontend/commit/1eb691f56eddffeab0eaa9946ab6d1ece6f073aa))


### Documentation

* correct consent-banner, HSTS, suite-ui version, and Dependabot claims ([#223](https://github.com/sethbacon/terraform-state-manager-frontend/issues/223), [#224](https://github.com/sethbacon/terraform-state-manager-frontend/issues/224), [#225](https://github.com/sethbacon/terraform-state-manager-frontend/issues/225), [#226](https://github.com/sethbacon/terraform-state-manager-frontend/issues/226)) ([#260](https://github.com/sethbacon/terraform-state-manager-frontend/issues/260)) ([0a62fba](https://github.com/sethbacon/terraform-state-manager-frontend/commit/0a62fba34d2e2a72fb5297f6e7d0a9849fbd41e9))
* disclose shared-package a11y mechanisms + fix stale coverage floor ([#239](https://github.com/sethbacon/terraform-state-manager-frontend/issues/239), [#240](https://github.com/sethbacon/terraform-state-manager-frontend/issues/240)) ([#265](https://github.com/sethbacon/terraform-state-manager-frontend/issues/265)) ([489ed58](https://github.com/sethbacon/terraform-state-manager-frontend/commit/489ed58e655db9c8e5534fec6635966250f231bb))


### Refactor

* **frontend:** shared API-error util + guard server-sourced PR URL ([#219](https://github.com/sethbacon/terraform-state-manager-frontend/issues/219), [#209](https://github.com/sethbacon/terraform-state-manager-frontend/issues/209)) ([#250](https://github.com/sethbacon/terraform-state-manager-frontend/issues/250)) ([3f6e0a1](https://github.com/sethbacon/terraform-state-manager-frontend/commit/3f6e0a180bce2c1097119d68b659420d2642bf8d))

## [1.22.0](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.21.0...v1.22.0) (2026-07-23)


### Features

* admin Branding page for whitelabel theming ([#201](https://github.com/sethbacon/terraform-state-manager-frontend/issues/201)) ([7e09ed8](https://github.com/sethbacon/terraform-state-manager-frontend/commit/7e09ed8eb05851d16c0bbf46d5e121672e03043d))
* **sources:** test-before-save and per-source sync status on the Sources page ([#191](https://github.com/sethbacon/terraform-state-manager-frontend/issues/191)) ([3d3bf09](https://github.com/sethbacon/terraform-state-manager-frontend/commit/3d3bf098cf3145060a73678e4cc7067308fdf88a)), closes [#184](https://github.com/sethbacon/terraform-state-manager-frontend/issues/184)
* **version-lab:** open a run detail dialog with full error and version matrix ([#196](https://github.com/sethbacon/terraform-state-manager-frontend/issues/196)) ([85af04b](https://github.com/sethbacon/terraform-state-manager-frontend/commit/85af04b5b850611c2f4777fa74016b98f901d5db)), closes [#186](https://github.com/sethbacon/terraform-state-manager-frontend/issues/186)


### Bug Fixes

* **auth:** log out and redirect on a mid-session 401 instead of stranding the shell ([#194](https://github.com/sethbacon/terraform-state-manager-frontend/issues/194)) ([1e6117d](https://github.com/sethbacon/terraform-state-manager-frontend/commit/1e6117d0b9925d3b77f7c9dd17b2dd1384443b12)), closes [#185](https://github.com/sethbacon/terraform-state-manager-frontend/issues/185)
* **drift:** clear the bulk selection when the page or a filter changes ([#195](https://github.com/sethbacon/terraform-state-manager-frontend/issues/195)) ([09aa401](https://github.com/sethbacon/terraform-state-manager-frontend/commit/09aa4010ee76a047593b0dd8db03a2b21d827cbd)), closes [#187](https://github.com/sethbacon/terraform-state-manager-frontend/issues/187)
* **sources:** preserve unmodeled config keys when editing a source ([#190](https://github.com/sethbacon/terraform-state-manager-frontend/issues/190)) ([4779910](https://github.com/sethbacon/terraform-state-manager-frontend/commit/47799103271e74fe965f92313915af18bfc1fd6f))
* **ui:** consistency & polish cluster ([#189](https://github.com/sethbacon/terraform-state-manager-frontend/issues/189)) ([#198](https://github.com/sethbacon/terraform-state-manager-frontend/issues/198)) ([39169e3](https://github.com/sethbacon/terraform-state-manager-frontend/commit/39169e350a5474e9250f8286db7bc95f248ec83f))


### Performance

* bound DOM size in the states browser and reports table ([#200](https://github.com/sethbacon/terraform-state-manager-frontend/issues/200)) ([c7ba371](https://github.com/sethbacon/terraform-state-manager-frontend/commit/c7ba37159a4b0572136a1fd6e6cfd9a1d8bf47b1))

## [1.21.0](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.20.0...v1.21.0) (2026-07-18)


### Features

* **notifications:** adopt shared NotificationChannelsSection and ApiKeyExpirySettingsCard ([0358bb8](https://github.com/sethbacon/terraform-state-manager-frontend/commit/0358bb894399214dfb85ebc34a484d15a7a73290))

## [1.20.0](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.19.0...v1.20.0) (2026-07-17)


### Features

* **notifications:** SMTP relay settings UI ([#175](https://github.com/sethbacon/terraform-state-manager-frontend/issues/175)) ([2faa4a7](https://github.com/sethbacon/terraform-state-manager-frontend/commit/2faa4a76278415708f4a368733883fcf38923f23))


### Bug Fixes

* **ci:** add blocking Trivy image scan to the release pipeline ([#170](https://github.com/sethbacon/terraform-state-manager-frontend/issues/170)) ([4562235](https://github.com/sethbacon/terraform-state-manager-frontend/commit/456223550e494ea7ad32bfef4204b742fad1d5f0))
* **docker:** apk upgrade to patch nginx base-image OS CVEs ([#176](https://github.com/sethbacon/terraform-state-manager-frontend/issues/176)) ([e9466a4](https://github.com/sethbacon/terraform-state-manager-frontend/commit/e9466a4b3eb918bd812b802c30f96825da736c3f))
* exact-pin @4cloudguru/cloud-suite-ui and disclose it in SECURITY.md/ARCHITECTURE.md ([#168](https://github.com/sethbacon/terraform-state-manager-frontend/issues/168)) ([e2e290f](https://github.com/sethbacon/terraform-state-manager-frontend/commit/e2e290f9421681169c0c98acfd0b91633e4585bb))
* validate backend URLs, add error boundary, and clear query cache on logout ([#174](https://github.com/sethbacon/terraform-state-manager-frontend/issues/174)) ([06cab12](https://github.com/sethbacon/terraform-state-manager-frontend/commit/06cab123fda10e3251bdd6c7eda0fb3b187d82ee))

## [1.19.0](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.18.4...v1.19.0) (2026-07-10)


### Features

* backup content viewer, restore-preview diff, and 409 force-override flow ([#161](https://github.com/sethbacon/terraform-state-manager-frontend/issues/161)) ([ab91eee](https://github.com/sethbacon/terraform-state-manager-frontend/commit/ab91eeee8fc1510d29a571af1c09fcbe16254c30))
* drift runs/records pagination, filtering, bulk actions, and source/state pickers ([#165](https://github.com/sethbacon/terraform-state-manager-frontend/issues/165)) ([0d01cf9](https://github.com/sethbacon/terraform-state-manager-frontend/commit/0d01cf902a0d549232a81cfd38d55a55197e4da8))
* show active state locks with admin force-unlock ([#159](https://github.com/sethbacon/terraform-state-manager-frontend/issues/159)) ([8b31a1e](https://github.com/sethbacon/terraform-state-manager-frontend/commit/8b31a1e1ea3d1dd40ecec1c6810ea0f780d6473c))


### Bug Fixes

* align vitest async timeouts to stop flaky full-suite failures ([b86f5ac](https://github.com/sethbacon/terraform-state-manager-frontend/commit/b86f5acdd5f0bc2222cd139c57902a611dc0d070))
* audit export was silently capped at 50 rows ([#160](https://github.com/sethbacon/terraform-state-manager-frontend/issues/160)) ([013e039](https://github.com/sethbacon/terraform-state-manager-frontend/commit/013e039949b9a6023bc94490dc6eccfaa61bc565))

## [1.18.4](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.18.3...v1.18.4) (2026-07-01)


### Bug Fixes

* **sources:** let state ops target a single resource instance ([#156](https://github.com/sethbacon/terraform-state-manager-frontend/issues/156)) ([6cd0c34](https://github.com/sethbacon/terraform-state-manager-frontend/commit/6cd0c3404c37b8d0a8cb7106549d5b60c52bc53a))

## [1.18.3](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.18.2...v1.18.3) (2026-06-30)


### Bug Fixes

* **nav:** move the admin Dashboard to the top of the grouped nav ([#154](https://github.com/sethbacon/terraform-state-manager-frontend/issues/154)) ([83b3a03](https://github.com/sethbacon/terraform-state-manager-frontend/commit/83b3a033d113f471c4800323eee82c31c5a0e883))

## [1.18.2](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.18.1...v1.18.2) (2026-06-30)


### Bug Fixes

* **nav:** match the admin Dashboard page-title icon to the nav icon ([#151](https://github.com/sethbacon/terraform-state-manager-frontend/issues/151)) ([0a61c0f](https://github.com/sethbacon/terraform-state-manager-frontend/commit/0a61c0fa65ae4ced644d2cfdc36856c398bec799))

## [1.18.1](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.18.0...v1.18.1) (2026-06-30)


### Refactor

* consume suite-ui consent, theme & identity ([#145](https://github.com/sethbacon/terraform-state-manager-frontend/issues/145)) ([e1cfcd7](https://github.com/sethbacon/terraform-state-manager-frontend/commit/e1cfcd7285b807f5d0d5ad4ef9684e0733efd85a))
* **shell:** consume SuiteLayout from @4cloudguru/cloud-suite-ui ([#150](https://github.com/sethbacon/terraform-state-manager-frontend/issues/150)) ([54f0c4f](https://github.com/sethbacon/terraform-state-manager-frontend/commit/54f0c4fc9820b21defa77ef89ea0f8af8b6856f9))
* **shell:** consume SuiteSwitcher from @4cloudguru/cloud-suite-ui ([#149](https://github.com/sethbacon/terraform-state-manager-frontend/issues/149)) ([7fbd209](https://github.com/sethbacon/terraform-state-manager-frontend/commit/7fbd209be12a06edfc7f02b68e2ff828f91f6242))

## [1.18.0](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.17.0...v1.18.0) (2026-06-28)


### Features

* UX alignment + consume @4cloudguru/cloud-suite-ui ([#142](https://github.com/sethbacon/terraform-state-manager-frontend/issues/142)) ([0900227](https://github.com/sethbacon/terraform-state-manager-frontend/commit/09002276efb309bb26c89ae500afc2c7e179a194))

## [1.17.0](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.16.1...v1.17.0) (2026-06-26)


### Features

* **reports:** add a scoped Refresh button to the Reports page ([c0e9ace](https://github.com/sethbacon/terraform-state-manager-frontend/commit/c0e9acecfecdbbe397510be8b7541ebd02cfe4c0))
* **reports:** add a scoped Refresh button to the Reports page ([58aed7f](https://github.com/sethbacon/terraform-state-manager-frontend/commit/58aed7f8efafb1a0cd778958ba4a40859e684d9a))


### Bug Fixes

* **reports:** persist last filter set across navigation ([fe97bbb](https://github.com/sethbacon/terraform-state-manager-frontend/commit/fe97bbb6fef7edf2320af002a116788bf99682c9))
* **reports:** persist the last filter set across navigation ([cccaff6](https://github.com/sethbacon/terraform-state-manager-frontend/commit/cccaff6ffb3d48195759dbdc3dd5f91a25fdd8a3))

## [1.16.1](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.16.0...v1.16.1) (2026-06-25)


### Bug Fixes

* **sources:** shorten state delete button label to "Delete" ([#137](https://github.com/sethbacon/terraform-state-manager-frontend/issues/137)) ([0f95022](https://github.com/sethbacon/terraform-state-manager-frontend/commit/0f95022da080ad67dff345c9bf064f31b183053e))

## [1.16.0](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.15.0...v1.16.0) (2026-06-24)


### Features

* **sources:** add admin-only "Delete state" action ([#135](https://github.com/sethbacon/terraform-state-manager-frontend/issues/135)) ([f10ca87](https://github.com/sethbacon/terraform-state-manager-frontend/commit/f10ca875089c06c9beebf78f2f9c3af5d92c77c0)), closes [#134](https://github.com/sethbacon/terraform-state-manager-frontend/issues/134)

## [1.15.0](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.14.0...v1.15.0) (2026-06-22)


### Features

* paginate + filter Version Lab runs list ([#133](https://github.com/sethbacon/terraform-state-manager-frontend/issues/133)) ([ba838f6](https://github.com/sethbacon/terraform-state-manager-frontend/commit/ba838f6f3139417feaccbc443a8e95090f0dc6cd))
* **sources:** separate report export from state-file download ([#131](https://github.com/sethbacon/terraform-state-manager-frontend/issues/131)) ([0e695db](https://github.com/sethbacon/terraform-state-manager-frontend/commit/0e695db87ea54c2d656c30d703e9968ef87a0c76)), closes [#129](https://github.com/sethbacon/terraform-state-manager-frontend/issues/129)


### Dependencies

* bump @types/node to ^24 in frontend ([#130](https://github.com/sethbacon/terraform-state-manager-frontend/issues/130)) ([68d34a7](https://github.com/sethbacon/terraform-state-manager-frontend/commit/68d34a7fad9be286cc6b5e10b62a47d51a4d8a93))

## [1.14.0](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.13.0...v1.14.0) (2026-06-21)


### Features

* add template-style selector to drift + version lab workflow dialogs ([#127](https://github.com/sethbacon/terraform-state-manager-frontend/issues/127)) ([adecf61](https://github.com/sethbacon/terraform-state-manager-frontend/commit/adecf616f4a7d7e1360e2f4844f53499bd37d62e))
* **notifications:** add Microsoft Teams and email channel types ([#125](https://github.com/sethbacon/terraform-state-manager-frontend/issues/125)) ([d5dce4c](https://github.com/sethbacon/terraform-state-manager-frontend/commit/d5dce4c6b59ed31c18ef443661d8a1b1c8e6dcc3))


### Bug Fixes

* **deps:** force js-yaml &gt;= 4.2.0 to clear CVE-2026-53550 ([#128](https://github.com/sethbacon/terraform-state-manager-frontend/issues/128)) ([8bb545b](https://github.com/sethbacon/terraform-state-manager-frontend/commit/8bb545b0a31ffd260b5d50f1fad6b0ac12c8ea21))

## [1.13.0](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.12.0...v1.13.0) (2026-06-19)


### Features

* **drift:** show per-resource changed attributes in drift modals ([#123](https://github.com/sethbacon/terraform-state-manager-frontend/issues/123)) ([3a9b169](https://github.com/sethbacon/terraform-state-manager-frontend/commit/3a9b169a5f4cf11e9476c00ddb0ec31d176db73a))

## [1.12.0](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.11.0...v1.12.0) (2026-06-19)


### Features

* **dashboard:** public landing page + unified authenticated dashboard ([#122](https://github.com/sethbacon/terraform-state-manager-frontend/issues/122)) ([7600b20](https://github.com/sethbacon/terraform-state-manager-frontend/commit/7600b20f5c365ead1803ba982a3e2fd3a56197cd))


### Bug Fixes

* **a11y:** label the main navigation landmark ([#116](https://github.com/sethbacon/terraform-state-manager-frontend/issues/116)) ([6a7a714](https://github.com/sethbacon/terraform-state-manager-frontend/commit/6a7a71447f1f960e6bb16520bca415ec1bc330ae))
* **nav:** label the /admin entry and breadcrumb root `Dashboard` ([#118](https://github.com/sethbacon/terraform-state-manager-frontend/issues/118)) ([3e1cb38](https://github.com/sethbacon/terraform-state-manager-frontend/commit/3e1cb38217d196767c49baf0c192cc9c92d7ff23))
* **nav:** strengthen the selected sidebar tint in dark mode ([#121](https://github.com/sethbacon/terraform-state-manager-frontend/issues/121)) ([c4a2970](https://github.com/sethbacon/terraform-state-manager-frontend/commit/c4a29708e47e80e0d48a38faa1ef4a54bb701c3d))
* **nav:** use Title Case `API Keys` label ([#117](https://github.com/sethbacon/terraform-state-manager-frontend/issues/117)) ([7eaa275](https://github.com/sethbacon/terraform-state-manager-frontend/commit/7eaa275fb2dd66804cb56d23bac177bb8b53b785))

## [1.11.0](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.10.0...v1.11.0) (2026-06-19)


### Features

* **drift:** edit pipeline connections and fix delete icon alignment ([#111](https://github.com/sethbacon/terraform-state-manager-frontend/issues/111)) ([ef3fa7e](https://github.com/sethbacon/terraform-state-manager-frontend/commit/ef3fa7e6cec2e7a80a3671db35a67309fb4feac6))

## [1.10.0](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.9.0...v1.10.0) (2026-06-18)


### Features

* CI templates admin page + editable drift wizard preview ([#109](https://github.com/sethbacon/terraform-state-manager-frontend/issues/109)) ([75447f2](https://github.com/sethbacon/terraform-state-manager-frontend/commit/75447f22fcc39f079f2d2c09c7e0d403513f979a))
* **reports:** dynamic state-file query, filter, and export ([#108](https://github.com/sethbacon/terraform-state-manager-frontend/issues/108)) ([54c8457](https://github.com/sethbacon/terraform-state-manager-frontend/commit/54c84575768ab62470bf3b7b7402381f4417b57f))

## [1.9.0](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.8.0...v1.9.0) (2026-06-18)


### Features

* **dashboard:** export filtered version states as CSV ([#106](https://github.com/sethbacon/terraform-state-manager-frontend/issues/106)) ([6ac172e](https://github.com/sethbacon/terraform-state-manager-frontend/commit/6ac172eb5a10566d7a34b3d11f37bb761d2436a0))

## [1.8.0](https://github.com/sethbacon/terraform-state-manager-frontend/compare/v1.7.1...v1.8.0) (2026-06-18)


### Features

* **dashboard:** drill into state files by Terraform version ([#104](https://github.com/sethbacon/terraform-state-manager-frontend/issues/104)) ([a87d9b0](https://github.com/sethbacon/terraform-state-manager-frontend/commit/a87d9b0bde3b735572e311a4cd9bebdcdaa515e2))

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
