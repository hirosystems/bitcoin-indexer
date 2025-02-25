## [3.0.0-beta.11](https://github.com/hirosystems/ordhook/compare/v3.0.0-beta.10...v3.0.0-beta.11) (2025-02-25)


### Bug Fixes

* **brc20:** historical token balance ([#444](https://github.com/hirosystems/ordhook/issues/444)) ([41438ac](https://github.com/hirosystems/ordhook/commit/41438aca962ba7f2c4add4df87740fdb6df6de00))
* display unbound inscription satpoints as all zeros with unbound sequence as offset ([#445](https://github.com/hirosystems/ordhook/issues/445)) ([6815878](https://github.com/hirosystems/ordhook/commit/68158786f06c0a4ad6f56509eaa96012986f7790))

## [3.0.0-beta.10](https://github.com/hirosystems/ordhook/compare/v3.0.0-beta.9...v3.0.0-beta.10) (2025-02-18)


### Bug Fixes

* **api:** multiple parent display ([703f98f](https://github.com/hirosystems/ordhook/commit/703f98f77f9797db3e4f4f0e3e14fbdb7c5275f8))

## [3.0.0-beta.9](https://github.com/hirosystems/ordhook/compare/v3.0.0-beta.8...v3.0.0-beta.9) (2025-02-18)


### Features

* **api:** add parent_refs field to inscription responses ([#436](https://github.com/hirosystems/ordhook/issues/436)) ([5630644](https://github.com/hirosystems/ordhook/commit/563064413bcc2168f96cb87af4fd6ab51ed36e73))


### Bug Fixes

* **api:** show delegate inscription id correctly ([#439](https://github.com/hirosystems/ordhook/issues/439)) ([d4ee264](https://github.com/hirosystems/ordhook/commit/d4ee264ad0bec2749299b60e985927ba87d6f40e))
* calculate charms correctly when inscription is unbound ([#440](https://github.com/hirosystems/ordhook/issues/440)) ([acfda83](https://github.com/hirosystems/ordhook/commit/acfda83757e5c06977ecf43ca396b7fcd780d71b))

## [3.0.0-beta.8](https://github.com/hirosystems/ordhook/compare/v3.0.0-beta.7...v3.0.0-beta.8) (2025-02-18)


### Features

* **api:** return inscription charms in responses ([#435](https://github.com/hirosystems/ordhook/issues/435)) ([a7073da](https://github.com/hirosystems/ordhook/commit/a7073da0b4bb0c61d57284c48c65f73b0491a909))
* index inscription charms ([#433](https://github.com/hirosystems/ordhook/issues/433)) ([4291eab](https://github.com/hirosystems/ordhook/commit/4291eabba7110ca5d4684f4801e234621e64d96b))

## [3.0.0-beta.7](https://github.com/hirosystems/ordhook/compare/v3.0.0-beta.6...v3.0.0-beta.7) (2025-02-16)


### Bug Fixes

* kill process when a streamed block fails to index ([#431](https://github.com/hirosystems/ordhook/issues/431)) ([84e189b](https://github.com/hirosystems/ordhook/commit/84e189b9b49b710a3b143dab4ff53155951620c0))

## [3.0.0-beta.6](https://github.com/hirosystems/ordhook/compare/v3.0.0-beta.5...v3.0.0-beta.6) (2025-02-13)


### Features

* migrate ordinals api to ordhook repo ([#389](https://github.com/hirosystems/ordhook/issues/389)) ([205b4c8](https://github.com/hirosystems/ordhook/commit/205b4c80bdc29fc10447c50546123d75fc829b77))


### Bug Fixes

* **brc20:** verify ordinal transfers in chunks instead of individually ([#394](https://github.com/hirosystems/ordhook/issues/394)) ([fe842e2](https://github.com/hirosystems/ordhook/commit/fe842e2e778729b635220719aad26c09684439e2))
* clean up rocksdb connections during rollbacks ([#420](https://github.com/hirosystems/ordhook/issues/420)) ([216cd52](https://github.com/hirosystems/ordhook/commit/216cd52c0ea654e14601167a64cd7040903c08a2))
* remove double parsing of inscriptions ([#421](https://github.com/hirosystems/ordhook/issues/421)) ([19c8a79](https://github.com/hirosystems/ordhook/commit/19c8a79cd2da64897c7862bae156bd37ef1f88f2))
* upgrade `ord` dependencies and integrate `chainhook-sdk` code ([#397](https://github.com/hirosystems/ordhook/issues/397)) ([fcffa7e](https://github.com/hirosystems/ordhook/commit/fcffa7e5c1567fe6c8d6e19a5aa18ee67633938c)), closes [#412](https://github.com/hirosystems/ordhook/issues/412)

## [3.0.0-beta.5](https://github.com/hirosystems/ordhook/compare/v3.0.0-beta.4...v3.0.0-beta.5) (2025-01-29)


### Bug Fixes

* store inscription content as is ([#391](https://github.com/hirosystems/ordhook/issues/391)) ([3f10607](https://github.com/hirosystems/ordhook/commit/3f10607ba9ef1d6b0d6fd68f9779031e239c0596))

## [3.0.0-beta.4](https://github.com/hirosystems/ordhook/compare/v3.0.0-beta.3...v3.0.0-beta.4) (2025-01-28)


### Bug Fixes

* **brc20:** add to_address index to operations table ([#390](https://github.com/hirosystems/ordhook/issues/390)) ([67c6035](https://github.com/hirosystems/ordhook/commit/67c6035828994dd72e7ffa72b4e405c04465acb3))

## [3.0.0-beta.3](https://github.com/hirosystems/ordhook/compare/v3.0.0-beta.2...v3.0.0-beta.3) (2025-01-14)


### ⚠ BREAKING CHANGES

* store inscription data in postgres instead of sqlite (#375)

### Code Refactoring

* store inscription data in postgres instead of sqlite ([#375](https://github.com/hirosystems/ordhook/issues/375)) ([4afb201](https://github.com/hirosystems/ordhook/commit/4afb2010068770078c7d9fd2ab37533352379c15))

## [3.0.0-beta.2](https://github.com/hirosystems/ordhook/compare/v3.0.0-beta.1...v3.0.0-beta.2) (2024-09-24)


### Bug Fixes

* roll back ordinals db changes when brc20 db commit fails ([#367](https://github.com/hirosystems/ordhook/issues/367)) ([f4e0c79](https://github.com/hirosystems/ordhook/commit/f4e0c7935b825d2119d20c5acf08d289fe231423))

## [3.0.0-beta.1](https://github.com/hirosystems/ordhook/compare/v2.2.5...v3.0.0-beta.1) (2024-09-20)


### ⚠ BREAKING CHANGES

* support brc20 activity on scan blocks command (#350)
* keep original deployed ticker for brc20 tokens (#349)

### Features

* add prometheus monitoring ([#356](https://github.com/hirosystems/ordhook/issues/356)) ([f35e1d0](https://github.com/hirosystems/ordhook/commit/f35e1d00e7940e31abcb8439b5b12a43be5023ea))
* keep original deployed ticker for brc20 tokens ([#349](https://github.com/hirosystems/ordhook/issues/349)) ([39774a9](https://github.com/hirosystems/ordhook/commit/39774a9f867d79932826f9d50d271ee1bf45c13d))
* support a separate storage directory for observers.sqlite ([#354](https://github.com/hirosystems/ordhook/issues/354)) ([7a65fdf](https://github.com/hirosystems/ordhook/commit/7a65fdf10728b7701cbcf7b83db92ec74d13535a))
* support brc20 activity on scan blocks command ([#350](https://github.com/hirosystems/ordhook/issues/350)) ([caacff7](https://github.com/hirosystems/ordhook/commit/caacff7c4f3d148b37232e04030814fa3ce3b30b))
* wait for bitcoind to be at chain tip before starting service ([#364](https://github.com/hirosystems/ordhook/issues/364)) ([d4b67bb](https://github.com/hirosystems/ordhook/commit/d4b67bb6f6ee16bac2add119f477ba42da824a98))


### Bug Fixes

* also check config when looking for brc20 db connection ([#347](https://github.com/hirosystems/ordhook/issues/347)) ([d80388b](https://github.com/hirosystems/ordhook/commit/d80388b505255117963a53206e41987e34551aaf))
* only create brc-20 db connection and cache if required ([#357](https://github.com/hirosystems/ordhook/issues/357)) ([5692426](https://github.com/hirosystems/ordhook/commit/5692426e4b85dde1fd7aefd01dd7f25a4f969fad))

## [2.2.5](https://github.com/hirosystems/ordhook/compare/v2.2.4...v2.2.5) (2024-07-23)


### Bug Fixes

* abort scan on predicate action error ([#345](https://github.com/hirosystems/ordhook/issues/345)) ([7ee763a](https://github.com/hirosystems/ordhook/commit/7ee763a263a3cf0202cf8da5f0903cfc94fdc137))
* validate and wait for bitcoind block height responses ([#340](https://github.com/hirosystems/ordhook/issues/340)) ([b28b92e](https://github.com/hirosystems/ordhook/commit/b28b92ebab149bf40ce102556fe194653cad81c8))

## [2.2.4](https://github.com/hirosystems/ordhook/compare/v2.2.3...v2.2.4) (2024-06-26)


### Bug Fixes

* release 2.2.4 ([6a8a63a](https://github.com/hirosystems/ordhook/commit/6a8a63a01dcca7544f4090877cae7cc8af16b2ce))

## [2.2.3](https://github.com/hirosystems/ordhook/compare/v2.2.2...v2.2.3) (2024-06-26)


### Bug Fixes

* nested readwrite connection ([#327](https://github.com/hirosystems/ordhook/issues/327)) ([a593995](https://github.com/hirosystems/ordhook/commit/a593995e606c10de0b7145a5e003cd18743d32c6))

## [2.2.2](https://github.com/hirosystems/ordhook/compare/v2.2.1...v2.2.2) (2024-06-18)


### Bug Fixes

* augment brc20 tx by tx_index ([#315](https://github.com/hirosystems/ordhook/issues/315)) ([122bfdf](https://github.com/hirosystems/ordhook/commit/122bfdfd80c21242c8b46055d4f924387f909919))
* retrieving block height from inscriptions db ([6c9ea06](https://github.com/hirosystems/ordhook/commit/6c9ea060ef9c6fbb944203e764e42e1b5d75ee5d))

## [2.2.1](https://github.com/hirosystems/ordhook/compare/v2.2.0...v2.2.1) (2024-06-11)


### Bug Fixes

* base catchup on inscriptions db, vs blocks db ([a76a037](https://github.com/hirosystems/ordhook/commit/a76a037cf8965863e5bb2401637a2327f79dcb5f))
* consider meta protocols when switching to stream ([#311](https://github.com/hirosystems/ordhook/issues/311)) ([26d8ed9](https://github.com/hirosystems/ordhook/commit/26d8ed9f5c3121f9caa7ca89436d980088e27bd8))
* set is_streaming_blocks to false when scanning ([#309](https://github.com/hirosystems/ordhook/issues/309)) ([b31f6bd](https://github.com/hirosystems/ordhook/commit/b31f6bdea79a8a553b31f1492da80ffd8c35a6e5))

## [2.2.0](https://github.com/hirosystems/ordhook/compare/v2.1.0...v2.2.0) (2024-05-24)


### Features

* add BRC-20 indexing ([#284](https://github.com/hirosystems/ordhook/issues/284)) ([729affb](https://github.com/hirosystems/ordhook/commit/729affb699d5cddaf6e2e41690d071ae9c4009fa))


### Bug Fixes

* issue [#296](https://github.com/hirosystems/ordhook/issues/296) ([#300](https://github.com/hirosystems/ordhook/issues/300)) ([7a8dca5](https://github.com/hirosystems/ordhook/commit/7a8dca53c116fb76e1e7d026c7cdf6863cd74ccd))

## [2.1.0](https://github.com/hirosystems/ordhook/compare/v2.0.1...v2.1.0) (2024-02-12)


### Features

* confirm before deleting blocks ([a5fee25](https://github.com/hirosystems/ordhook/commit/a5fee2520c23e6374d86d7effbbcbf304551f817))
* display git-commit ([3256427](https://github.com/hirosystems/ordhook/commit/3256427632e3443c988a3a096ad6208bfbaf58d4))
* extract additional data ([4141fd6](https://github.com/hirosystems/ordhook/commit/4141fd6cca2b742bb6f491f002a6bd1f9260d602))
* improve queue management ([d57ac75](https://github.com/hirosystems/ordhook/commit/d57ac758e143ae902bb7d92827c3a3a41bcea1da))
* improve transfers handling ([21ce9ca](https://github.com/hirosystems/ordhook/commit/21ce9caabdd3ce51874dc27775267048094c05f4))
* introduce stream-indexing flag ([9c9e2a5](https://github.com/hirosystems/ordhook/commit/9c9e2a57a529775baf73dd6095fde90f98926c51))
* locations are now ordinal_number centric (instead of inscription_id) ([d667958](https://github.com/hirosystems/ordhook/commit/d6679588fac9f7335e3072103882eb6a42c5d561))
* migrate to tcmalloc ([7d048a3](https://github.com/hirosystems/ordhook/commit/7d048a3128fc4809950c2aca85c7b139119a05c1))
* revisit config files ([1c80b67](https://github.com/hirosystems/ordhook/commit/1c80b67658a27057b12874e1d7ebfbc0d84dd287))


### Bug Fixes

* add unicity constraints, cascade changes ([4b81d1e](https://github.com/hirosystems/ordhook/commit/4b81d1ebe49cf544d51ed158feb75b414faa1c65))
* additional adjustments on pointers ([faacfc5](https://github.com/hirosystems/ordhook/commit/faacfc53ac5f798bf267feadfdcaf2bcb35bbe39))
* consider end_block when scanning ([2feb512](https://github.com/hirosystems/ordhook/commit/2feb5128a1c2c659e758616f36b93d336afa5a16))
* git-commit ENV ([203cfa3](https://github.com/hirosystems/ordhook/commit/203cfa39d024188fd6e151607b519bd3b04183dd))
* handle inscription pointers ([3ce1932](https://github.com/hirosystems/ordhook/commit/3ce1932a5465624379646e11329eb53a7eb5e4c7))
* imitate overflow behavior ([306f850](https://github.com/hirosystems/ordhook/commit/306f850e7f679b14161b9940a117507037adf0bd))
* jubilee block transition ([d1b995b](https://github.com/hirosystems/ordhook/commit/d1b995b460ebe857abf00debbadea3dc5cd7f724))
* jubilee increment ([4222d46](https://github.com/hirosystems/ordhook/commit/4222d46b164400e9d877ecbeb2c8e2fb47f145ae))
* observers.sqlite code path missing ([5076275](https://github.com/hirosystems/ordhook/commit/5076275153cc1e838931863469a0a04c407d35e5))
* ordinal_number data type ([0b54537](https://github.com/hirosystems/ordhook/commit/0b54537003132b07d86a0cb06de8d1583057467f))
* pointer ignored ([2db6f1f](https://github.com/hirosystems/ordhook/commit/2db6f1fb449e7f014cd5590bb95fb9f3c7b30712))
* satoshis computations duplicates ([22eb729](https://github.com/hirosystems/ordhook/commit/22eb729f33ee73432a1a6c0674bf27a605684b3c))
* simulate ord numbering bug ([5828f82](https://github.com/hirosystems/ordhook/commit/5828f820a717c447ed263bc9be893419834273cf))
* tests ([869b17e](https://github.com/hirosystems/ordhook/commit/869b17e1701dddc7fac8248f9c4ac98329d3a8eb))
* transfer duplicates ([0416cd8](https://github.com/hirosystems/ordhook/commit/0416cd8e50270ecb4b6f810f20947945b1b49fcb))
* transfer offset ([1c3a5dd](https://github.com/hirosystems/ordhook/commit/1c3a5ddae423b7d03a5e78182eed378cd847cf0e))
* transfer tracking ([8098673](https://github.com/hirosystems/ordhook/commit/80986734c8a59aca5247000e4c1af3ad624a46f7))
* typo ([eca79f0](https://github.com/hirosystems/ordhook/commit/eca79f0e92ae82843f55d2e270a02874ad4e1120))

## [2.0.1](https://github.com/hirosystems/ordhook/compare/v2.0.0...v2.0.1) (2024-01-08)


### Bug Fixes

* replay + jubilee number increment ([d5bf88f](https://github.com/hirosystems/ordhook/commit/d5bf88f1deaf1e03acc5dade74fbd3d17c5ce813))

## [2.0.0](https://github.com/hirosystems/ordhook/compare/v1.2.0...v2.0.0) (2024-01-05)


### ⚠ BREAKING CHANGES

* implement Jubilee support
* bump ordhook-core version

* Merge pull request #240 from hirosystems/develop ([2ea6f34](https://github.com/hirosystems/ordhook/commit/2ea6f347b4a47cb82632245c6bb0faa6f8ff6651)), closes [#240](https://github.com/hirosystems/ordhook/issues/240)


### Features

* add --check-blocks-integrity flag ([d7d90e7](https://github.com/hirosystems/ordhook/commit/d7d90e71bfab59143bece3281ddd7373314c3cec))
* inital changes to support subenv deployments ([887aeaf](https://github.com/hirosystems/ordhook/commit/887aeafbd8753920379a81f19664c37c48c5d506))
* jubilee support, disk optimizations  ([#239](https://github.com/hirosystems/ordhook/issues/239)) ([424f5bb](https://github.com/hirosystems/ordhook/commit/424f5bb98cfbed85579dbfaaf2eeacbdcf288570)), closes [#186](https://github.com/hirosystems/ordhook/issues/186) [#170](https://github.com/hirosystems/ordhook/issues/170) [#171](https://github.com/hirosystems/ordhook/issues/171) [#285](https://github.com/hirosystems/ordhook/issues/285) [#310](https://github.com/hirosystems/ordhook/issues/310) [#168](https://github.com/hirosystems/ordhook/issues/168) [#173](https://github.com/hirosystems/ordhook/issues/173) [#175](https://github.com/hirosystems/ordhook/issues/175) [#178](https://github.com/hirosystems/ordhook/issues/178) [#182](https://github.com/hirosystems/ordhook/issues/182) [#183](https://github.com/hirosystems/ordhook/issues/183) [#173](https://github.com/hirosystems/ordhook/issues/173) [#171](https://github.com/hirosystems/ordhook/issues/171) [#178](https://github.com/hirosystems/ordhook/issues/178) [#170](https://github.com/hirosystems/ordhook/issues/170) [#171](https://github.com/hirosystems/ordhook/issues/171) [#285](https://github.com/hirosystems/ordhook/issues/285) [#310](https://github.com/hirosystems/ordhook/issues/310) [#168](https://github.com/hirosystems/ordhook/issues/168) [#173](https://github.com/hirosystems/ordhook/issues/173) [#175](https://github.com/hirosystems/ordhook/issues/175) [#178](https://github.com/hirosystems/ordhook/issues/178) [#214](https://github.com/hirosystems/ordhook/issues/214) [#170](https://github.com/hirosystems/ordhook/issues/170) [#171](https://github.com/hirosystems/ordhook/issues/171) [#285](https://github.com/hirosystems/ordhook/issues/285) [#310](https://github.com/hirosystems/ordhook/issues/310) [#168](https://github.com/hirosystems/ordhook/issues/168) [#173](https://github.com/hirosystems/ordhook/issues/173) [#175](https://github.com/hirosystems/ordhook/issues/175) [#178](https://github.com/hirosystems/ordhook/issues/178) [#175](https://github.com/hirosystems/ordhook/issues/175) [#214](https://github.com/hirosystems/ordhook/issues/214) [#200](https://github.com/hirosystems/ordhook/issues/200) [#211](https://github.com/hirosystems/ordhook/issues/211) [#208](https://github.com/hirosystems/ordhook/issues/208) [#187](https://github.com/hirosystems/ordhook/issues/187) [#204](https://github.com/hirosystems/ordhook/issues/204) [#187](https://github.com/hirosystems/ordhook/issues/187) [#205](https://github.com/hirosystems/ordhook/issues/205) [#170](https://github.com/hirosystems/ordhook/issues/170) [#171](https://github.com/hirosystems/ordhook/issues/171) [#285](https://github.com/hirosystems/ordhook/issues/285) [#310](https://github.com/hirosystems/ordhook/issues/310) [#168](https://github.com/hirosystems/ordhook/issues/168) [#173](https://github.com/hirosystems/ordhook/issues/173) [#175](https://github.com/hirosystems/ordhook/issues/175) [#178](https://github.com/hirosystems/ordhook/issues/178) [#182](https://github.com/hirosystems/ordhook/issues/182) [#183](https://github.com/hirosystems/ordhook/issues/183) [#184](https://github.com/hirosystems/ordhook/issues/184) [#185](https://github.com/hirosystems/ordhook/issues/185) [#186](https://github.com/hirosystems/ordhook/issues/186)


### Bug Fixes

* change arg ([786f6b8](https://github.com/hirosystems/ordhook/commit/786f6b89edc6647443fb6c1e96f395496612cff5))


### Miscellaneous Chores

* bump ordhook-core version ([9458956](https://github.com/hirosystems/ordhook/commit/94589567f7fa252379aa3f53733bca441268c68f))

## [1.2.0](https://github.com/hirosystems/ordhook/compare/v1.1.3...v1.2.0) (2023-12-06)


### Features

* revisit observers handling ([c6bd89e](https://github.com/hirosystems/ordhook/commit/c6bd89e63cf67b93af5641bd21d9b70e3d9dfb37))


### Bug Fixes

* build error / warning ([15b5d60](https://github.com/hirosystems/ordhook/commit/15b5d60c220fd5b703ba34430444c9195d672454))
* stateful observers ([fa7cc42](https://github.com/hirosystems/ordhook/commit/fa7cc4214a9ef1a958b81a23286d360207aaad82))

## [1.1.3](https://github.com/hirosystems/ordhook/compare/v1.1.2...v1.1.3) (2023-11-29)


### Bug Fixes

* update sequence_metadata when augmenting block ([e0b3dd1](https://github.com/hirosystems/ordhook/commit/e0b3dd110773192c954a0c11e3b6f70ff29991c1))

## [1.1.2](https://github.com/hirosystems/ordhook/compare/v1.1.1...v1.1.2) (2023-11-28)


### Bug Fixes

* bounded channel ([6d7de20](https://github.com/hirosystems/ordhook/commit/6d7de209c8045a74a1bc33be633c9268fd5eb6a0))

## [1.1.1](https://github.com/hirosystems/ordhook/compare/v1.1.0...v1.1.1) (2023-11-27)


### Bug Fixes

* around issue [#187](https://github.com/hirosystems/ordhook/issues/187) for testnet ([#204](https://github.com/hirosystems/ordhook/issues/204)) ([0d2ff31](https://github.com/hirosystems/ordhook/commit/0d2ff313d0193640d6b1ee1e64a8b84735b98b43))
* better handling of database locks ([#200](https://github.com/hirosystems/ordhook/issues/200)) ([f820169](https://github.com/hirosystems/ordhook/commit/f820169aa047e1015162200dc20e395eb4fef2c7))
* testnet support ([#208](https://github.com/hirosystems/ordhook/issues/208)) ([490fe01](https://github.com/hirosystems/ordhook/commit/490fe0143404f569e5afb61904cf9ad9da8d21af))
* tweak sqlite connections ([#217](https://github.com/hirosystems/ordhook/issues/217)) ([334565c](https://github.com/hirosystems/ordhook/commit/334565ce13c2448746962f5b1e744b40188d5b94))

## [1.1.0](https://github.com/hirosystems/ordhook/compare/v1.0.1...v1.1.0) (2023-11-23)


### Features

* ordhook-sdk-js refactoring ([#186](https://github.com/hirosystems/ordhook/issues/186)) ([0d145df](https://github.com/hirosystems/ordhook/commit/0d145dfb899b564fe56ea04aa554012103af5dec))


### Bug Fixes

* add destination to transfer events - release v1.0.2 ([47f365e](https://github.com/hirosystems/ordhook/commit/47f365eb4786721c09524fb3454ba34d70a8dbd9)), closes [#170](https://github.com/hirosystems/ordhook/issues/170) [#171](https://github.com/hirosystems/ordhook/issues/171) [#285](https://github.com/hirosystems/ordhook/issues/285) [#310](https://github.com/hirosystems/ordhook/issues/310) [#168](https://github.com/hirosystems/ordhook/issues/168) [#173](https://github.com/hirosystems/ordhook/issues/173) [#175](https://github.com/hirosystems/ordhook/issues/175) [#178](https://github.com/hirosystems/ordhook/issues/178) [#182](https://github.com/hirosystems/ordhook/issues/182) [#183](https://github.com/hirosystems/ordhook/issues/183)
* build error / warning ([055c0d7](https://github.com/hirosystems/ordhook/commit/055c0d78d626c51903347bba2c01ebeb29973f9f))
* ci ([ac3d458](https://github.com/hirosystems/ordhook/commit/ac3d4580f961b3b054047fe81278330c8ce009bc))
* CI rust version mismatch, create empty db  ([#173](https://github.com/hirosystems/ordhook/issues/173)) ([cd2842e](https://github.com/hirosystems/ordhook/commit/cd2842eac79b624ad76c3cd2bccf3fdd5da800d9))
* databases lock ([d0b57c5](https://github.com/hirosystems/ordhook/commit/d0b57c5771e623219219f7bdb3d7f9ac055105bc))
* enable streaming for in-memory observers ([#171](https://github.com/hirosystems/ordhook/issues/171)) ([50f8393](https://github.com/hirosystems/ordhook/commit/50f8393ae351e6c504188103371ad7be6a7a0c74))
* grammar tweaks ([54e5fa1](https://github.com/hirosystems/ordhook/commit/54e5fa1321fece6f01a248472f5c15d778ea3ae0))
* grammar tweaks ([e50aef0](https://github.com/hirosystems/ordhook/commit/e50aef00b47fa653fb263a6af63b1e88dbc6a519))
* grammar updates ([66a4559](https://github.com/hirosystems/ordhook/commit/66a4559aecfd8beea91ebdf24f665a1a58f475d8))
* initial flow ([#178](https://github.com/hirosystems/ordhook/issues/178)) ([8bb24be](https://github.com/hirosystems/ordhook/commit/8bb24beb9a6eedec546cc1f449b5abfee7fd8aaa))
* release 1.0.2 ([#179](https://github.com/hirosystems/ordhook/issues/179)) ([ec1f28e](https://github.com/hirosystems/ordhook/commit/ec1f28ea5083443b1598636f2d2efb325eb94d34)), closes [#170](https://github.com/hirosystems/ordhook/issues/170) [#171](https://github.com/hirosystems/ordhook/issues/171) [#285](https://github.com/hirosystems/ordhook/issues/285) [#310](https://github.com/hirosystems/ordhook/issues/310) [#168](https://github.com/hirosystems/ordhook/issues/168) [#173](https://github.com/hirosystems/ordhook/issues/173) [#175](https://github.com/hirosystems/ordhook/issues/175) [#178](https://github.com/hirosystems/ordhook/issues/178)
* release develop ([#214](https://github.com/hirosystems/ordhook/issues/214)) ([4a31032](https://github.com/hirosystems/ordhook/commit/4a3103233bfe9d44f27ae5a8ed5437f758a5be23))
* release v1.0.2 ([#180](https://github.com/hirosystems/ordhook/issues/180)) ([ac3915f](https://github.com/hirosystems/ordhook/commit/ac3915f035a2777f1a0aaf00dee66fafc5f04db6)), closes [#170](https://github.com/hirosystems/ordhook/issues/170) [#171](https://github.com/hirosystems/ordhook/issues/171) [#285](https://github.com/hirosystems/ordhook/issues/285) [#310](https://github.com/hirosystems/ordhook/issues/310) [#168](https://github.com/hirosystems/ordhook/issues/168) [#173](https://github.com/hirosystems/ordhook/issues/173) [#175](https://github.com/hirosystems/ordhook/issues/175) [#178](https://github.com/hirosystems/ordhook/issues/178)
* service boot sequence ([#175](https://github.com/hirosystems/ordhook/issues/175)) ([a744825](https://github.com/hirosystems/ordhook/commit/a74482588ca7acb8121be6724b0a7d8897fe3e7a))

## [1.0.1](https://github.com/hirosystems/ordhook/compare/v1.0.0...v1.0.1) (2023-09-15)


### Bug Fixes

* release v1.0.1 ([#176](https://github.com/hirosystems/ordhook/issues/176)) ([f2cb8b2](https://github.com/hirosystems/ordhook/commit/f2cb8b2c89a357dfcab051c5be4ee6d8b22c2da9))

## 1.0.0 (2023-09-07)


### Features

* ability to control inclusion of inputs/outputs/proofs/witness ([daf5547](https://github.com/hirosystems/ordhook/commit/daf55476c910a5b74ddb1a33c789f6d85587e86a))
* ability to download hord.sqlite ([3dafa53](https://github.com/hirosystems/ordhook/commit/3dafa53ac0552ff793d3b36068163d3a546eb45e))
* ability to generate config ([9fda9d0](https://github.com/hirosystems/ordhook/commit/9fda9d0d349e6b42443654aea9060dff11b54c7e))
* ability to replay inscriptions ([f1adca9](https://github.com/hirosystems/ordhook/commit/f1adca9b0fc5568d11b259f343a257c17105d3b1))
* ability to resume ([6c7eaa3](https://github.com/hirosystems/ordhook/commit/6c7eaa3beef9296f09156b587588bdb3265e14b5))
* ability to target blocks ([f6be49e](https://github.com/hirosystems/ordhook/commit/f6be49e24d1928d6ad43edfd45052ccea7f48071))
* ability to tolerate corrupted data ([adb1b98](https://github.com/hirosystems/ordhook/commit/adb1b988a6ab577fd4f46115fa92600bd5f731c6))
* ability to track updates when scanning bitcoin (+refactor) ([9e54bff](https://github.com/hirosystems/ordhook/commit/9e54bfff35dfcc7e0e6a7785fbe80c3e8e6fcf4a))
* ability to update stacks db from cli + fix caching logic ([3ea9f59](https://github.com/hirosystems/ordhook/commit/3ea9f597af3ce5012e7ff551795321b1649afd22))
* add command to check stacks db integrity ([322f473](https://github.com/hirosystems/ordhook/commit/322f47343c101a4556c946fc4c7ba383086dd234))
* add get block command to cli ([97de0b0](https://github.com/hirosystems/ordhook/commit/97de0b071be524375db654cceb02ba9b8c6a15d8))
* add log, fix ordinal transfers scan ([c4202da](https://github.com/hirosystems/ordhook/commit/c4202dad2cca505232981f27ac6d32dc08cf899d))
* add logs ([473ddd0](https://github.com/hirosystems/ordhook/commit/473ddd05953d95c2e8169a327e233f317051c6e3))
* add metrics to `/ping` response of event observer server ([#297](https://github.com/hirosystems/ordhook/issues/297)) ([0e1ee7c](https://github.com/hirosystems/ordhook/commit/0e1ee7c1eec10c01f6c6eafd010642c107985459)), closes [#285](https://github.com/hirosystems/ordhook/issues/285)
* add option to skip chainhook node ping ([a7c0b12](https://github.com/hirosystems/ordhook/commit/a7c0b12ad9ea418f47912ad96638a452e1e7b7c3))
* add options for logs ([917090b](https://github.com/hirosystems/ordhook/commit/917090b408b0559752809cf4fae707c31f405c90))
* add post_transfer_output_value ([4ce0e9e](https://github.com/hirosystems/ordhook/commit/4ce0e9e5dba7c0b9fda912286f1e133ea817fd18))
* add retry ([117e41e](https://github.com/hirosystems/ordhook/commit/117e41eae829f251788075a346feafc46e656300))
* add shared cache ([07523ae](https://github.com/hirosystems/ordhook/commit/07523aed1a20e71b21d91683df174e32c6fbaceb))
* add support for bitcoin op DelegatedStacking ([6516155](https://github.com/hirosystems/ordhook/commit/65161550555ed8725ef9c116058a7075a9cba52b))
* add transfers table ([db14f60](https://github.com/hirosystems/ordhook/commit/db14f6034704e51aaede29bdcd87553be5468f16))
* always try to initialize tables when starting service ([1a9eddb](https://github.com/hirosystems/ordhook/commit/1a9eddb6aa543f2cd12caa17b346e9549e40f939))
* attempt to scale up multithreading ([be91202](https://github.com/hirosystems/ordhook/commit/be91202d6b4338e8dc61cc9e502444405bde5796))
* attempt to support cursed inscriptions ([9b45f90](https://github.com/hirosystems/ordhook/commit/9b45f908b89569fc09ea97edf132a46ba4904d87))
* attempt transition to lazy model ([dda0b03](https://github.com/hirosystems/ordhook/commit/dda0b03ea33e309ba1a403d32d05e906cfd16de5))
* batch ingestion, improve cleaning ([168162e](https://github.com/hirosystems/ordhook/commit/168162e0ddf8f833970ca6b89bce76d92ec37e7c))
* better handling of blessed inscription turning cursed ([f11509a](https://github.com/hirosystems/ordhook/commit/f11509ab9771ac0348280d3ed2d032f7f26703ba))
* cascade changes in CLI interface ([24f27fe](https://github.com/hirosystems/ordhook/commit/24f27fea6328561e90cb9c9ab275e6d6c3642c0a))
* cascade hord activation ([42c090b](https://github.com/hirosystems/ordhook/commit/42c090ba7ebb4a8c43397f54621859407689fd97))
* chainhook-sdk config niteties ([7d9e179](https://github.com/hirosystems/ordhook/commit/7d9e179464f9afd199f3ee72b85a78b9a5de978c))
* class interface ([9dfec45](https://github.com/hirosystems/ordhook/commit/9dfec454f5f915cb2d9a995b3f309b6afe7b6698))
* client draft ([6a6451c](https://github.com/hirosystems/ordhook/commit/6a6451c864f31db83831da7daa09ac49b60c2c57))
* complete migration to lazy blocks ([fa50584](https://github.com/hirosystems/ordhook/commit/fa5058471ac22de844fca3a6c0e200fb84eb8f1f))
* disable certs ([389f77d](https://github.com/hirosystems/ordhook/commit/389f77d473bc7f813cf648e1ab0aaba1efff158b))
* draft naive inscription detection ([9b3e38a](https://github.com/hirosystems/ordhook/commit/9b3e38a441cd84481fef8bb89a4d3107bf87350c))
* draft ordhook-sdk-js ([b264e72](https://github.com/hirosystems/ordhook/commit/b264e7281be80344edb82348c2189c5745b724b1))
* draft sha256 verification (wip) ([e6f0619](https://github.com/hirosystems/ordhook/commit/e6f0619a7ccf4ba903bc77fb8f7dffdb910b8139))
* drafting lazy deserialization ([eaa2f71](https://github.com/hirosystems/ordhook/commit/eaa2f71fceeb91f666d1d797f862d409dbd526b5))
* dry config ([135297e](https://github.com/hirosystems/ordhook/commit/135297e9785b996b17a27c303568b232d0a4a876))
* expose `is_streaming_blocks` prop ([1ba27d7](https://github.com/hirosystems/ordhook/commit/1ba27d745986dde75e33fda084ae5ea89a29b09a))
* expose more functions for working with the indexer ([654fead](https://github.com/hirosystems/ordhook/commit/654feadbdfb3b5e108d3ca32e865167e49ed6d02))
* expose scanning status in GET endpoint ([156c463](https://github.com/hirosystems/ordhook/commit/156c463cc0abedccbe31e886327ec0b014d65ac8))
* expose transfers_pre_inscription ([65afd77](https://github.com/hirosystems/ordhook/commit/65afd77492b7f173e9be573dc2b8f206ef01e5bf))
* fetch full bitcoin block, including witness data ([ee9a345](https://github.com/hirosystems/ordhook/commit/ee9a3452acf2c1812b39f381b5fc63952e4c36e1))
* fix download block ([38b50df](https://github.com/hirosystems/ordhook/commit/38b50df7a165d1e3962e06d704517679cb188f83))
* handle stacks unconfirmed state scans ([f6d050f](https://github.com/hirosystems/ordhook/commit/f6d050fbceb29dca5718f986f986f8628ab6d5e6))
* handle transfer ([fd5da52](https://github.com/hirosystems/ordhook/commit/fd5da52df4f92a6a55a0149cf6b28f264afecc30))
* HTTP responses adjustments ([51572ef](https://github.com/hirosystems/ordhook/commit/51572efd9393880d28e29501d5ef6a84906ec984))
* implement and document new development flow ([66019a0](https://github.com/hirosystems/ordhook/commit/66019a06e7b96119a2629e7a919c10f256c2b6ca))
* implement zmq runloop ([c6c1c0e](https://github.com/hirosystems/ordhook/commit/c6c1c0ecce4bfb74e566fd846bad111f103732ad))
* import inscription parser ([45e0147](https://github.com/hirosystems/ordhook/commit/45e0147ecf34513e6c64d313e8e423d1501faf41))
* improve cli ergonomics ([991e33f](https://github.com/hirosystems/ordhook/commit/991e33ff4231d650b60525bc841c8838b9f62932))
* improve cli experience ([e865628](https://github.com/hirosystems/ordhook/commit/e8656285b22f24c7bb1d7d4da64bca264301f000))
* improve debug log ([5df77d7](https://github.com/hirosystems/ordhook/commit/5df77d7f84cb0a88f080212238525eebd464eb0a))
* improve hord db commands ([21c09c2](https://github.com/hirosystems/ordhook/commit/21c09c296f702b8bddb41808537a6023f714bf75))
* improve onboarding ([deaa739](https://github.com/hirosystems/ordhook/commit/deaa739bddbec0a0ef5e9194c682221332798517))
* improve ordinal scan efficiency ([e510d4b](https://github.com/hirosystems/ordhook/commit/e510d4bd09a90bb9dc073c68009fdd3353b5cf8d))
* improve README ([f30e6f4](https://github.com/hirosystems/ordhook/commit/f30e6f4ed52ef8e374c2f2ccd0f7af41d287e6da))
* improve repair command conveniency ([46be0ab](https://github.com/hirosystems/ordhook/commit/46be0ab5a72aba9ac4ca3515d170a67fc83382f4))
* improving curse approach ([dcb8054](https://github.com/hirosystems/ordhook/commit/dcb805485f341bf40a9a39dc85b935ddf1fec029))
* in-house thread pool ([bc5ffdd](https://github.com/hirosystems/ordhook/commit/bc5ffddb5b9c8c32e4b4a3646072e3f0374f6c7b))
* inscription replay speedup ([33a4f8b](https://github.com/hirosystems/ordhook/commit/33a4f8b6aff69d6e53ec78c907054f29c573c59e))
* introduce check command ([f17dc4c](https://github.com/hirosystems/ordhook/commit/f17dc4c343860dda99da42c1eadcce5d2a79ec99))
* introduce evaluation reports ([54ad874](https://github.com/hirosystems/ordhook/commit/54ad874ee5c8281145d3423952a6a607044f376e))
* introduce migration script ([8c2b16c](https://github.com/hirosystems/ordhook/commit/8c2b16cc486a3e1d51e80fceffed7f70ca8050ad))
* introduce new predicate + refactor schemas ([611c79c](https://github.com/hirosystems/ordhook/commit/611c79cee35de63a1b8ca623d676d186dc86d244))
* introduce rocksdb storage for Stacks ([4564e88](https://github.com/hirosystems/ordhook/commit/4564e8818a32f9d1f6fde24c506d74269508e33f))
* introduce sync command ([ab022e6](https://github.com/hirosystems/ordhook/commit/ab022e60981846ca1a8a746c96547c74cad87a85))
* introduce terminate function ([91616f6](https://github.com/hirosystems/ordhook/commit/91616f65311116996f4787f176067382146c4618))
* is_streaming_blocks ([aacf487](https://github.com/hirosystems/ordhook/commit/aacf487de67bca0fd178d5c7bc5fdc4a6f1fd2f6))
* keep 1st tx in cache ([0978a5d](https://github.com/hirosystems/ordhook/commit/0978a5d4c15efe45c92afa7526f38c453e4a0eef))
* logic to start ingestion during indexing ([3c1c99d](https://github.com/hirosystems/ordhook/commit/3c1c99df5d9df6d8275d69e4ec9f98808c58cbb1))
* merge "inscription_revealed" and "inscription_transferred" into "inscription_feed" ([741290d](https://github.com/hirosystems/ordhook/commit/741290de13b282ab6a9d5032365ece35f6cef200))
* migrate stacks scans to rocksdb ([4408b1e](https://github.com/hirosystems/ordhook/commit/4408b1e7ecf827c0c29948826d6fb0e509319517))
* migration to rocksdb, moving json parsing from networking thread ([5ad0147](https://github.com/hirosystems/ordhook/commit/5ad0147fa09789f51b7a79207a00ff38a1890058))
* move thread pool size to config ([bc313fa](https://github.com/hirosystems/ordhook/commit/bc313fad5c4d4af23b4f34bf27b7ea5048180c98))
* multithread traversals ([fba5c89](https://github.com/hirosystems/ordhook/commit/fba5c89a48f1779ed7708af990d6ea9890d31e00))
* number of retries for 4 to 3 ([b294dff](https://github.com/hirosystems/ordhook/commit/b294dff69a539c4228429cd9ededfa865ae92ec7))
* optimize memory ([5db1531](https://github.com/hirosystems/ordhook/commit/5db1531a3d09ea5f370fcef4856f78c0a5b0cdf7))
* optimize replay ([be26dac](https://github.com/hirosystems/ordhook/commit/be26daccd06f9c92bdb3127ac1cadcb523855bb3))
* ordinal inscription_transfer code complete ([f55a5ee](https://github.com/hirosystems/ordhook/commit/f55a5ee167c99a5b9a9166403017501eb2c80653))
* plug inscription processing in ibd ([df36617](https://github.com/hirosystems/ordhook/commit/df3661721496654bc2d288debe1df88e0a5da060))
* plumbing for ordhook-sdk-js ([7487589](https://github.com/hirosystems/ordhook/commit/74875896a3bf49d352ac07e7d7f73be9b1aca3df))
* polish `hord find sat_point` command ([d071484](https://github.com/hirosystems/ordhook/commit/d0714842a24f3bb467c8cabd851d5eb5566da1dc))
* polish first impression ([3c2b00c](https://github.com/hirosystems/ordhook/commit/3c2b00ce38f8f6aa7ef2bfd4d4a8fe2d59cc6d47))
* predicate schemas ([198cdaa](https://github.com/hirosystems/ordhook/commit/198cdaa6c80647e6ae93959c028f2263869e2550))
* prototype warmup ([fa6c86f](https://github.com/hirosystems/ordhook/commit/fa6c86fb1f5afa6f0f1ee44c3b6ed018cac0fb0c))
* re-approach stacks block commit schema ([218d599](https://github.com/hirosystems/ordhook/commit/218d5998d692b6c2fe80c4626a41a33121a05168))
* re-implement satoshi overflows handling ([8ea5bdf](https://github.com/hirosystems/ordhook/commit/8ea5bdf819667882de6a79b32e63b98cf1c0c636))
* re-introduce ingestion ([71c90d7](https://github.com/hirosystems/ordhook/commit/71c90d755d4a819a8dbae78a128c14812e727b74))
* restore ability to replay transfers ([98e7e9b](https://github.com/hirosystems/ordhook/commit/98e7e9b21dd68e96f9d41f8b9e5386b1d6f8cf1e))
* return enable in api ([f39259c](https://github.com/hirosystems/ordhook/commit/f39259ceebba8161e22540523d2a6ee9651ceee0))
* return local result when known ([5441851](https://github.com/hirosystems/ordhook/commit/5441851db7659b9859e4732ef244fb77cdb4670a))
* revisit caching strategy ([2705b95](https://github.com/hirosystems/ordhook/commit/2705b9501b3ab9cbab63c1e55b249e6de888c267))
* revisit threading model ([05b6d5c](https://github.com/hirosystems/ordhook/commit/05b6d5c4d722b87d1e7a21be21ae876354e66eac))
* scan inscription revealed ([84c5a0c](https://github.com/hirosystems/ordhook/commit/84c5a0c52119c87a3ba1c7c23199023e9bf7ec4e))
* scan inscription revealed ([644d515](https://github.com/hirosystems/ordhook/commit/644d5155d21ea21ce60f5cdd15d93482989cd737))
* share traversals_cache over 10 blocks spans ([b0378c3](https://github.com/hirosystems/ordhook/commit/b0378c30992f0b31a846dd389f819443bdf45e87))
* simplify + improve coordination ([1922fd9](https://github.com/hirosystems/ordhook/commit/1922fd9bc43c19467a7ef2af381d053879a0d9b2))
* start investigating zmq signaling ([0ec2653](https://github.com/hirosystems/ordhook/commit/0ec265380c9108bde90cb4290873e166b23cd0c1))
* streamline processors ([13421db](https://github.com/hirosystems/ordhook/commit/13421db2973bf05959af68d4093931fda1bf1187))
* support cursed inscriptions in chainhook client ([d7cc5a4](https://github.com/hirosystems/ordhook/commit/d7cc5a4410d7034d70080b8461065f3a422400cb))
* support for latest archives, add logs ([494cf3c](https://github.com/hirosystems/ordhook/commit/494cf3c9a5637c8ea9c43244495e91b005518ef5))
* tweak mmap / page_size values ([5316a57](https://github.com/hirosystems/ordhook/commit/5316a575b08859b429b5f8b1db6fa887d4343605))
* update chainhook-sdk ([f052e08](https://github.com/hirosystems/ordhook/commit/f052e08469644739a89be947a0fd64b8de810932))
* update inscription transfer logic ([9d0d106](https://github.com/hirosystems/ordhook/commit/9d0d106e9c1225a8153d4f415a5cdc31d9636ef2))
* update inscription transfer schemas ([f80e983](https://github.com/hirosystems/ordhook/commit/f80e9834810a9a64e749b891f1abbaf4c3154da8))
* upgrade `service start`  implementation + documentation ([02db65e](https://github.com/hirosystems/ordhook/commit/02db65e41790b7fe2a1032071dabfdebe7c8887b))
* use caching on streamed blocks ([784e9a0](https://github.com/hirosystems/ordhook/commit/784e9a0830e4e3ab46dcfc45491ee3fe395fa002))
* use thread pools for scans ([45b9abd](https://github.com/hirosystems/ordhook/commit/45b9abd3e0ec93e8f0d1f8ccb18959388f1d0a49))
* zmq sockets ([d2e328a](https://github.com/hirosystems/ordhook/commit/d2e328aa579afdaf34f112b06d233885c4295f12))


### Bug Fixes

* ability to run without redis ([96825c3](https://github.com/hirosystems/ordhook/commit/96825c35a8b5494333e4dd32971dec4bdef31029))
* add busy handler ([d712e0d](https://github.com/hirosystems/ordhook/commit/d712e0ddaec1ff107c21190fbf9082c7328ba116))
* add exp backoff ([f014c14](https://github.com/hirosystems/ordhook/commit/f014c142770a39b6a6b7bb78f2f7fbd4701dbf83))
* add retry logic in rocksdb ([247df20](https://github.com/hirosystems/ordhook/commit/247df2088a9e9c3ade1576d25876783a3ff9fc95))
* add retry logic to work around unexpected responses from bitcoind ([2ab6b32](https://github.com/hirosystems/ordhook/commit/2ab6b32ff099f4424be44a85e80cf1d046f3c9ec))
* additional adjustments ([fe26063](https://github.com/hirosystems/ordhook/commit/fe260635132ae685ecaf2d2dbdc054d6ea4549bf))
* additional fixes (network, address, offsets) ([8006000](https://github.com/hirosystems/ordhook/commit/80060000341643e8385b0d3aa15532ab09154b5f))
* address build warnings ([dc623a0](https://github.com/hirosystems/ordhook/commit/dc623a01e50acec7616afab165c2d82c7bf30fe9))
* address non-inscribed block case ([a7d08a3](https://github.com/hirosystems/ordhook/commit/a7d08a3722440c95c43a0871742da9cc2f6ae1ed))
* address redis disconnects ([a6b4a5f](https://github.com/hirosystems/ordhook/commit/a6b4a5fb385464598e3ed6c60dfafcf68c681c30))
* address remaining issues ([74b2fa9](https://github.com/hirosystems/ordhook/commit/74b2fa9411e3761441d12c262fcefdf24aa06713))
* adjust error message ([3e7b0d0](https://github.com/hirosystems/ordhook/commit/3e7b0d03f9099253fde2d245b9dee7fb2456570d))
* allow empty block ([fe8ce45](https://github.com/hirosystems/ordhook/commit/fe8ce455a1c93be58e1f72c14f1a5dafbbc78646))
* always fetch blocks ([97060a1](https://github.com/hirosystems/ordhook/commit/97060a13cae7b61cd45425e79b02d89a75c14648))
* async/await regression ([676aac1](https://github.com/hirosystems/ordhook/commit/676aac196d1c1e4566a973b32c2df5f4a5d2d2d6))
* attempt ([9e14fce](https://github.com/hirosystems/ordhook/commit/9e14fce0e4ffeaccd87b574362b1d57ae28b434f))
* attempt to fix offset ([e6c5d0e](https://github.com/hirosystems/ordhook/commit/e6c5d0eed8911e3645850684446987276dab9531))
* attempt to retrieve blocks from iterator ([f718071](https://github.com/hirosystems/ordhook/commit/f718071b33cf2c1d19a05297036f4bfe39ed7dba))
* attempt to tweak rocksdb ([11b9b6b](https://github.com/hirosystems/ordhook/commit/11b9b6be6204709e31ad3b6c9d234fe09a439cd3))
* auto enable stacks predicate ([30557f8](https://github.com/hirosystems/ordhook/commit/30557f86675977181778086cc3c04a47ba3cc9d5))
* backpressure on traversals ([3177e22](https://github.com/hirosystems/ordhook/commit/3177e22921c5831af58dd47be82d9e600ad12745))
* batch inscription ([cd1085c](https://github.com/hirosystems/ordhook/commit/cd1085ceb055e33cd31976b2e1bc22aed0175743))
* batch migration ([ed8b7ad](https://github.com/hirosystems/ordhook/commit/ed8b7ad2f368b319f1c7f800d729e6bf693182d6))
* better redis error handling ([debb06c](https://github.com/hirosystems/ordhook/commit/debb06cd5c24db1b199f631ea4e05b4cb09fab8f))
* better support of reinscriptions ([a1410e2](https://github.com/hirosystems/ordhook/commit/a1410e29ddcbf3e5f95a28aec9ee438f23ecf98c))
* better termination ([8a5482c](https://github.com/hirosystems/ordhook/commit/8a5482c131f94994f614a9390f9bb9d4ce0a3913))
* binary name ([4950a50](https://github.com/hirosystems/ordhook/commit/4950a50381c7ea286ae48375dc74ecd8978e1a1c))
* block streaming ([dcdfd16](https://github.com/hirosystems/ordhook/commit/dcdfd1655c06d5f71fdfff63258da9544e9bf2eb))
* boot sequence ([577f1c2](https://github.com/hirosystems/ordhook/commit/577f1c237e094b9e2d14928e620fe8d9032cc28c))
* boot sequence, logs, format ([d03f851](https://github.com/hirosystems/ordhook/commit/d03f85178df2438fa16a861a3d8a4b348adfbaad))
* borrow issue ([66e2a7c](https://github.com/hirosystems/ordhook/commit/66e2a7c785b11013a93d7dd4eb877a0fec37bfe4))
* broken build ([f0d471e](https://github.com/hirosystems/ordhook/commit/f0d471ea8b562f5176b89c43b4a4cbc107568660))
* broken test ([239b26a](https://github.com/hirosystems/ordhook/commit/239b26a6140fff38a190b5588f965418620d8fa7))
* broken tests ([2ab6e7d](https://github.com/hirosystems/ordhook/commit/2ab6e7d67981b4f6059080f5da43b08b54818e52))
* build ([4067f08](https://github.com/hirosystems/ordhook/commit/4067f0814f486d1e9b75a24845b82fb7b1c36c4f))
* build ([607ac95](https://github.com/hirosystems/ordhook/commit/607ac953b188142f141b0f42482a301c46398023))
* build error ([d6ed108](https://github.com/hirosystems/ordhook/commit/d6ed10894c8d479a938ef7b74aa08df0cc205ba9))
* build error ([bbede8b](https://github.com/hirosystems/ordhook/commit/bbede8b546ed61d4a72c434d95c92a5bf89e9bde))
* build error ([fa802fa](https://github.com/hirosystems/ordhook/commit/fa802fae7a6544a5155771d5e836965f573866df))
* build error ([44ca74b](https://github.com/hirosystems/ordhook/commit/44ca74b2c57f7ce564f6afa1be51b06629871ac0))
* build error ([053b781](https://github.com/hirosystems/ordhook/commit/053b7815a837fc96248687898a19a2bd07d57617))
* build error ([5c3bcf4](https://github.com/hirosystems/ordhook/commit/5c3bcf42fc4d59344c8a33f38f62d00a42c2643d))
* build error ([b78c0cc](https://github.com/hirosystems/ordhook/commit/b78c0ccea6d282c13bfe3775e335242b06259767))
* build error ([879ed67](https://github.com/hirosystems/ordhook/commit/879ed6775a605cdff3f9bdc0a2711ca9ed6d77f1))
* build errors ([60cd4d0](https://github.com/hirosystems/ordhook/commit/60cd4d0c61cc3db5861fdd3663cfe14045a9f394))
* build errors ([8dd91bf](https://github.com/hirosystems/ordhook/commit/8dd91bfce38835d2e8390d0f41e7a31eb40000c5))
* build errors / merge snafu ([47da0c1](https://github.com/hirosystems/ordhook/commit/47da0c132aebee155034f355b90bd3358b35ffc7))
* build errors + warnings ([938c6df](https://github.com/hirosystems/ordhook/commit/938c6dff27444d95f457156b7d0becc4c600f1e5))
* build failing ([83f1496](https://github.com/hirosystems/ordhook/commit/83f14964a60d05f734ec06f7841f975214bc286b))
* build warning ([561e51e](https://github.com/hirosystems/ordhook/commit/561e51eb279901bb9186a6bae2eab296378c360f))
* build warning ([75847df](https://github.com/hirosystems/ordhook/commit/75847df0d18e279004979e568f21ede430112d21))
* build warning ([0194483](https://github.com/hirosystems/ordhook/commit/0194483b754b05836fe156abb7d28a07022439e6))
* build warnings ([d3e998c](https://github.com/hirosystems/ordhook/commit/d3e998c469cc9092a49489c14f884ef76988adcf))
* build warnings ([e7ad175](https://github.com/hirosystems/ordhook/commit/e7ad1758053795015ae83fac6d5375c518ec2a1f))
* build warnings ([670bde6](https://github.com/hirosystems/ordhook/commit/670bde6379cb630ca4812fb13dc3884e52220246))
* bump incoming payload limit to 20mb ([7e15086](https://github.com/hirosystems/ordhook/commit/7e150861a48e31deb15feea446311e16e46fd7e0))
* cache invalidation ([05bd903](https://github.com/hirosystems/ordhook/commit/05bd9035eb800d23b638c0d5679bec1c06131a3d))
* cache L2 capacity ([e2fbc73](https://github.com/hirosystems/ordhook/commit/e2fbc73eaf5926135cf2d53156423675b3f90437))
* cache size ([ce61205](https://github.com/hirosystems/ordhook/commit/ce61205b96810dc975b8fd7b25b93eef495a0138))
* cache's ambitions ([e438db7](https://github.com/hirosystems/ordhook/commit/e438db75145ae9a14393bdb184ed5e7392272e0e))
* Cargo.toml ([759c3a3](https://github.com/hirosystems/ordhook/commit/759c3a393f7d60c9e50cfa20c1f12621ccd1ec35))
* chain mixup, add logs ([0427a10](https://github.com/hirosystems/ordhook/commit/0427a10a636411d116343bcfa7edf249a633b05d))
* change forking behavior ([4c10014](https://github.com/hirosystems/ordhook/commit/4c100147c212ce9a8439a83e712284d2457b4998))
* clean expectations ([f9e089f](https://github.com/hirosystems/ordhook/commit/f9e089f90d15f54e426b016aa165e7d64c4b84b6))
* clear cache more regularly ([c3b884f](https://github.com/hirosystems/ordhook/commit/c3b884fd305910344d879ea227bf84057c879815))
* command for db patch ([27f6838](https://github.com/hirosystems/ordhook/commit/27f683818d32a7309613714af915f3c2fc26ebf9))
* commands doc ([3485e6f](https://github.com/hirosystems/ordhook/commit/3485e6f3d98cbaec73d520b472d767997c321a2f))
* compatibility with clarinet ([a282655](https://github.com/hirosystems/ordhook/commit/a28265509faeed76d2be8898f3e4d3e5d69ada07))
* condition ([0233dc5](https://github.com/hirosystems/ordhook/commit/0233dc5bf0f5025fb90b01d84f105df1ca25b842))
* create dummy inscription for sats overflow ([84aa6ce](https://github.com/hirosystems/ordhook/commit/84aa6ce7fdf3d5f38aadf94741e7c3b6eb7e8ae4))
* db init command ([55e293b](https://github.com/hirosystems/ordhook/commit/55e293b3cad2a0ce97d5b80e5ea0360689abe760))
* decrease compression - from 4 bytes to 8 bytes ([b2eb314](https://github.com/hirosystems/ordhook/commit/b2eb31424b30d81299cd75a81d44eb2eb47982ac))
* deployer predicate wildcard ([05ca395](https://github.com/hirosystems/ordhook/commit/05ca395da140df8c7347ee8f852b137510853146))
* disable sleep ([41ecace](https://github.com/hirosystems/ordhook/commit/41ecacee0ef59b4047075f88bc7a26a432f06b89))
* disable steam scan when scanning past blocks ([e2949d2](https://github.com/hirosystems/ordhook/commit/e2949d213a87b8214c4a9cdebe4b4535fdc34070))
* disambiguate inscription_output_value and inscription_fee ([9816cbb](https://github.com/hirosystems/ordhook/commit/9816cbb70a70abc1e36aae09f254492eec42d240))
* do not panic ([a0fa1a9](https://github.com/hirosystems/ordhook/commit/a0fa1a9301ea3aeef5c5e040efbea39fa2b743c7))
* doc drift ([b595339](https://github.com/hirosystems/ordhook/commit/b59533902436bae6d503ad597b1b1f065a2bfa1c))
* docker build ([df39302](https://github.com/hirosystems/ordhook/commit/df39302616ded27e5609dd6b9ed6263a652b7846))
* docker file ([6ad5206](https://github.com/hirosystems/ordhook/commit/6ad52061ebec14c8e07a64fb973f4b015f9b8970))
* dockerfile ([73ad612](https://github.com/hirosystems/ordhook/commit/73ad612ea453c4a8a769ecd46d28f6ee7646325b))
* dockerfile ([da21ec4](https://github.com/hirosystems/ordhook/commit/da21ec4cb9dc999f443ab70acd447370598cee7b))
* documentation drift ([c5335a7](https://github.com/hirosystems/ordhook/commit/c5335a765cb21de1d555b48eaadf88ccd6862f26))
* documentation drift ([38153ca](https://github.com/hirosystems/ordhook/commit/38153ca22f5690922ccaf4ffc63c247b366a7b66))
* don't early exit when satoshi computing fail ([a8d76b0](https://github.com/hirosystems/ordhook/commit/a8d76b03acf87243767dbe55a09da8c0bde40ddf))
* don't enable predicate if error ([1274cbf](https://github.com/hirosystems/ordhook/commit/1274cbf9c4bd90b891700a832eda4943b0b0669f))
* early return ([8f97b56](https://github.com/hirosystems/ordhook/commit/8f97b5643b2bdbc34b7bf163e8e80dfd2f849961))
* edge case when requests processed in order ([8c4325f](https://github.com/hirosystems/ordhook/commit/8c4325f721c2d625c400cffb4b8329b6d1055be7))
* edge case when requests processed out of order ([a35cea2](https://github.com/hirosystems/ordhook/commit/a35cea2b54515b0587c3c9b7dc9a92681f850813))
* edge case when requests processed out of order ([a6651b8](https://github.com/hirosystems/ordhook/commit/a6651b851f54209d84869c1abb2b5941080fff0c))
* enable profiling ([f99b073](https://github.com/hirosystems/ordhook/commit/f99b0735285c3d4777cdd95add1242d04c1fdf31))
* enable specs on reboot ([f23be24](https://github.com/hirosystems/ordhook/commit/f23be246c2baa068e79078f40f128a6fd56dd749))
* enforce db reconnection in http endpoints ([bcd2a45](https://github.com/hirosystems/ordhook/commit/bcd2a45a865ef42db8672ebf25e4b25c9a27131c))
* enum serialization ([67cb340](https://github.com/hirosystems/ordhook/commit/67cb340674dc2a06f96d99d3e73d697567bbdebe))
* error management ([f0274f5](https://github.com/hirosystems/ordhook/commit/f0274f572662f3022062cb5d1526f21cb4a505c3))
* export all types on ts client ([be8bfbc](https://github.com/hirosystems/ordhook/commit/be8bfbcf606c078231e33f89d59c1111e75a66db))
* failing build ([1502d5d](https://github.com/hirosystems/ordhook/commit/1502d5d682eb7fe4a6a6ba873cbd7c3b10897523))
* fee ([0337f92](https://github.com/hirosystems/ordhook/commit/0337f92ce000e961a8f727bb881d5de00fe9787a))
* filter out sat overflows from payloads ([ce439ae](https://github.com/hirosystems/ordhook/commit/ce439ae9000f4164e2b13a32c02ccea29299cb51))
* gap in stacks scanning ([8c8c5c8](https://github.com/hirosystems/ordhook/commit/8c8c5c8611c895de7186cdc7713d4bcbf8e9302c))
* generator typo ([8a7eddb](https://github.com/hirosystems/ordhook/commit/8a7eddb09266c48891be08010d11fc921e0239df))
* handle hint and case of re-inscriptions ([f86b184](https://github.com/hirosystems/ordhook/commit/f86b184832c1a0542165d7628929fe4b16e5dd72))
* handle non-spending transaction ([cb01eb5](https://github.com/hirosystems/ordhook/commit/cb01eb55fd71b5bd13a88b7cdb04c1cc8f7a9a96))
* handle re-inscription for unbound inscriptions ([a1ffc1a](https://github.com/hirosystems/ordhook/commit/a1ffc1a59a8900b6872c14182cbeed80204ad494))
* hard coded dev-dependency ([5c105de](https://github.com/hirosystems/ordhook/commit/5c105de8b502f22870c2a6bacb04e3afa1793837))
* ignore invalid inscription ([f18bc00](https://github.com/hirosystems/ordhook/commit/f18bc00f5a6e1b99a894c5ea1f10cc1db43177cf))
* ignore transaction aborting that we could not classify ([37c80f7](https://github.com/hirosystems/ordhook/commit/37c80f7e83f18ab35f6e1e92c1d6b0cc7c1ebcf4))
* implement error handler ([d071b81](https://github.com/hirosystems/ordhook/commit/d071b81954882b6c9f3930f7a7c576f262fd184b))
* improve progress bar ([b28da56](https://github.com/hirosystems/ordhook/commit/b28da5697d7a8e59d672b93bcecd94b5bc26aff7))
* improve rewrite block command ([d524771](https://github.com/hirosystems/ordhook/commit/d52477142a1112c5cbcd29bab5d3d61fabf63710))
* in-block re-inscription case ([90db9c3](https://github.com/hirosystems/ordhook/commit/90db9c3d15bec8c9f0e61cb8cb5aebda71a21148))
* include blocks discovered during scan, if any ([1eabce2](https://github.com/hirosystems/ordhook/commit/1eabce25c3052e9a13bc218176c6e66c57a2b00c))
* include ordinals operations in standardized blocks ([a13351d](https://github.com/hirosystems/ordhook/commit/a13351d46a1306f8e73a31dcda6a2db09ab5262c))
* include proof on scan commands ([6574008](https://github.com/hirosystems/ordhook/commit/6574008ae87d4f40ce66a838e146276ed156eec9))
* increase number of retries ([343ddd6](https://github.com/hirosystems/ordhook/commit/343ddd65a8e52f20a4795727663b286c7d3f6c76))
* indexing ([45661ab](https://github.com/hirosystems/ordhook/commit/45661ab62c49d050cebd42cd5e2b2c252d4441ff))
* inject l1 cache hit in results (+ clearing) ([62fd929](https://github.com/hirosystems/ordhook/commit/62fd92948ee9c895de76c4ffceebc036495fdbaa))
* inscription fee ([2ac3022](https://github.com/hirosystems/ordhook/commit/2ac302235c30e085fc74b8d12aa4dfae41c5d73d))
* inscription_number ([a7d8153](https://github.com/hirosystems/ordhook/commit/a7d8153a8cb88093c80566b6c011b3609a330ebc))
* insert new locations ([6475aeb](https://github.com/hirosystems/ordhook/commit/6475aeb8d4ed3c185359d019480fd11825ffc677))
* iterate on values ([0c73e62](https://github.com/hirosystems/ordhook/commit/0c73e62902a58e7a2e67f9e22a8fb61098594df9))
* keep trying opening rocksdb conn if failing ([dbc794a](https://github.com/hirosystems/ordhook/commit/dbc794a0d400b0c56671eafc4033785dab9adbfa))
* lazy block approach ([b567322](https://github.com/hirosystems/ordhook/commit/b5673228598a64db96c3c1ba6e5fae0be315342c))
* leader_registered doc ([f9d7370](https://github.com/hirosystems/ordhook/commit/f9d7370c4398415fa4e1fcfc2de0b8c8c45d40f5))
* loading predicates from redis ([3bd308f](https://github.com/hirosystems/ordhook/commit/3bd308fb154305349fd8225cb815b51acac91423))
* log level, zeromq dependency ([4a2a6ef](https://github.com/hirosystems/ordhook/commit/4a2a6ef297b10ecdb740394d416db66b3b554b74))
* logic determining start height ([5dd300f](https://github.com/hirosystems/ordhook/commit/5dd300fb0514a0fff023fb7949bfa0a454ab133c))
* logs ([81be24e](https://github.com/hirosystems/ordhook/commit/81be24ef083de50f9a12f82e8ca0411b758367d9))
* mark inscriber_address as nullable ([77fd88b](https://github.com/hirosystems/ordhook/commit/77fd88b9c1a8e14733af2ac4d19ce08c053ae3f3))
* more pessimism on retries ([9b987c5](https://github.com/hirosystems/ordhook/commit/9b987c51a98b30ca1c40f301cdcfcf87a897f47d))
* move parsing back to network thread ([bad1ee6](https://github.com/hirosystems/ordhook/commit/bad1ee6d4e58981a6951565948540b29a8e687b3))
* moving stacks tip ([87c409e](https://github.com/hirosystems/ordhook/commit/87c409e01c610e0531eb21255fab892f5f48919e))
* multithreading cap ([c80ae60](https://github.com/hirosystems/ordhook/commit/c80ae60991a571c26c199c13e3a0698f0b18b8a3))
* myriad of improvements ([0633182](https://github.com/hirosystems/ordhook/commit/063318233d5416cb406dd68e74c46a0ee33ba040))
* nefarious logs ([3b01a48](https://github.com/hirosystems/ordhook/commit/3b01a48f1e30d45dcf7de3b404ac9de9732c45d9))
* network, cascade changes ([1f45ec2](https://github.com/hirosystems/ordhook/commit/1f45ec26da94fc9d32dd77eca5789356c5aa16c1))
* off by one ([2a0e75f](https://github.com/hirosystems/ordhook/commit/2a0e75f6a3058927aa30f1f7ce2edc408a49f2bc))
* off by one ([c31611f](https://github.com/hirosystems/ordhook/commit/c31611fb280d5b81f395c10f1b19c3bbc550a9be))
* off by one ([94e1141](https://github.com/hirosystems/ordhook/commit/94e11411f8f928d8593a48e2b63e1058bc463f03))
* off by one ([abf70e7](https://github.com/hirosystems/ordhook/commit/abf70e7204fadf7738ebb88f01656c988678e1f8))
* off by one error ([3832cf9](https://github.com/hirosystems/ordhook/commit/3832cf9770591b5c63228ee2ddbc483b4cfcfbbe))
* off by one inscriptions number ([cdfbf48](https://github.com/hirosystems/ordhook/commit/cdfbf487facdf2f04cbed608bec4c2cfaa7a2f27))
* off by one isssue ([fead2ed](https://github.com/hirosystems/ordhook/commit/fead2ed6931618f426a14fbe7b6910aa68c5ccd3))
* off by one issue ([a8988ba](https://github.com/hirosystems/ordhook/commit/a8988ba573f11cc6daa8845f651ef0c7e26de3ba))
* off by one issue ([155e3a6](https://github.com/hirosystems/ordhook/commit/155e3a6d29d47fb337102bfcc101450398afe7db))
* off by one issue on sats overflow ([8a12004](https://github.com/hirosystems/ordhook/commit/8a120040e70991cbc961b5d79bc838c99087bcdd))
* off-by-one error in backward traversal ([d4128aa](https://github.com/hirosystems/ordhook/commit/d4128aa8a16d89547e761d27c06b34a8ec39f070))
* off-by-one in sats number resolution ([42acbeb](https://github.com/hirosystems/ordhook/commit/42acbebcd5b155847b21065f84a61f5600bfbb85))
* offset ([278a655](https://github.com/hirosystems/ordhook/commit/278a65524bb128b1cd8752d3c57790ae9b0ab83b))
* only avoid override for blessed inscriptions ([b50bbc1](https://github.com/hirosystems/ordhook/commit/b50bbc1bf7a6cb41cf224f1b01cb6ba1b02907b8))
* optimize reg and dereg ([c2ec1b5](https://github.com/hirosystems/ordhook/commit/c2ec1b528320045e7162e978b0ad614dfd681675))
* ordinals scans ([62b62bd](https://github.com/hirosystems/ordhook/commit/62b62bd98ac553a31c24a83e8aa5b45207cfc221))
* outdated dockerfile ([771b036](https://github.com/hirosystems/ordhook/commit/771b0362b2540a59fed839a562ba7fa05cdbab62))
* outdated documentation ([f472a49](https://github.com/hirosystems/ordhook/commit/f472a49c4251a19e88870a47b39a05d504465207))
* overriden inscriptions ([25c6441](https://github.com/hirosystems/ordhook/commit/25c6441404b4d99e14bc390b9f029a1470d0546a))
* parsing ([1f047a9](https://github.com/hirosystems/ordhook/commit/1f047a9162813b0381b9fea98a4b21d90f0b9adf))
* patch absence of witness data ([f8fcfca](https://github.com/hirosystems/ordhook/commit/f8fcfcad6d147c3d0c8a28c471dc887d71c9ce19))
* patch boot latency ([0e3faf9](https://github.com/hirosystems/ordhook/commit/0e3faf9a61155609a8299963f24b2f315a751d05))
* patch crach ([20d9df6](https://github.com/hirosystems/ordhook/commit/20d9df6c65396a401811b41120ac5132c8179c33))
* patch db call ([d385df2](https://github.com/hirosystems/ordhook/commit/d385df203789bba93b618c8a5b4df1128d02ba3c))
* pipeline logic ([a864c85](https://github.com/hirosystems/ordhook/commit/a864c85c331759c3e529d5f48c0dff3224417c2c))
* pipeline resuming ([06883c6](https://github.com/hirosystems/ordhook/commit/06883c655aeefad83a610b311f7fa5eaef83dfa0))
* ports ([3ee98a8](https://github.com/hirosystems/ordhook/commit/3ee98a8be97393ff2cf942cad1efd8d9abcb4de4))
* potential resolve coinbase spent ([5d26738](https://github.com/hirosystems/ordhook/commit/5d267380f799f7387337a65a377978419e2f730a))
* PoxInfo default for scan commands ([a00ccf5](https://github.com/hirosystems/ordhook/commit/a00ccf589a2e4a2ca9140d46484fe25a5591d4f1))
* predicate documentation ([572cf20](https://github.com/hirosystems/ordhook/commit/572cf202bae5adc37f5799789a2a68211d95486b))
* predicate generator network ([8f0ae21](https://github.com/hirosystems/ordhook/commit/8f0ae216c8e85798756c884ebb4b2264970f1da8))
* provide optional values ([2cbf87e](https://github.com/hirosystems/ordhook/commit/2cbf87ebcc3ebdbfc9d49ef2452be6084b1750a2))
* re-apply initial fix ([f5cb516](https://github.com/hirosystems/ordhook/commit/f5cb516ee09a179e866293b0ed72a6300c601045))
* re-arrange logs ([2857d0a](https://github.com/hirosystems/ordhook/commit/2857d0a1a4611d6d07fe79913ba5d1d6c22b2440))
* re-enable sleep ([0f61a26](https://github.com/hirosystems/ordhook/commit/0f61a26fdab96d319f08dbffd06a97f96781b57a))
* re-initiate inscriptions connection every 250 blocks ([39671f4](https://github.com/hirosystems/ordhook/commit/39671f4378b0ca3292ba0752f47d0d5a089bbd35))
* re-qualify error to warn ([9431684](https://github.com/hirosystems/ordhook/commit/9431684afec426fe0f2d31ed4936c085e2d2889d))
* re-wire cmd ([a1447ad](https://github.com/hirosystems/ordhook/commit/a1447ad27784e9a8595344b94bb82abd14c3e248))
* README ([db1d584](https://github.com/hirosystems/ordhook/commit/db1d58482748245c35ca2699b66b9301e3bdbccb))
* recreate db conn on a regular basis ([81d8575](https://github.com/hirosystems/ordhook/commit/81d85759a40b94eaccf9f793735294df2b0e9876))
* redis update ([d4889f1](https://github.com/hirosystems/ordhook/commit/d4889f16b7a465c175dc3bc936bc8be4e6bd5dc6))
* related issue ([4b3a0da](https://github.com/hirosystems/ordhook/commit/4b3a0daa43627ac86fc82b4f2aed08e663a69882))
* remove rocksdb reconnect ([f2b067e](https://github.com/hirosystems/ordhook/commit/f2b067e85e8fdee7d3a349817c4f0506b7759ca3))
* remove sleep ([c371e74](https://github.com/hirosystems/ordhook/commit/c371e74de78cb31d5a1ba88cec64ace4741e3a40))
* remove start logic ([a04711a](https://github.com/hirosystems/ordhook/commit/a04711ad7c4d7d929077b2fc5a073c7fafe44a25))
* remove support for p2wsh inscription reveal support ([4fe71f2](https://github.com/hirosystems/ordhook/commit/4fe71f2622440d4c187e022631d1fb87e426596a))
* remove symbols ([108117b](https://github.com/hirosystems/ordhook/commit/108117b82edf806e78d2126b8166123bde3d8b2e))
* remove thread_max * 2 ([359c6f9](https://github.com/hirosystems/ordhook/commit/359c6f9422cdf8243ccb0e4ed963b5006b7598d8))
* reopen connect on failures ([3e15da5](https://github.com/hirosystems/ordhook/commit/3e15da5565c9cdaac8bbc1af9362fc7ace489144))
* reply with 500 on payload processing error ([eaa6d7b](https://github.com/hirosystems/ordhook/commit/eaa6d7b640c0442957b97ac795f2d0b9c02b8045))
* report generation ([0dce12a](https://github.com/hirosystems/ordhook/commit/0dce12a4e27bbec3619a42ded95636127f55b70a))
* restore stable values ([fb5c591](https://github.com/hirosystems/ordhook/commit/fb5c591943f3db4138ae51411b75a006ff197101))
* return blocks to rollback in reverse order ([9fab5a3](https://github.com/hirosystems/ordhook/commit/9fab5a34a2ed9cc60b81564c441c8188a1fe4628))
* reuse existing computation for fix ([222f7c3](https://github.com/hirosystems/ordhook/commit/222f7c3a14ae9b0013fb0e11c658d3210a91e221))
* revert fix, avoid collision in traversals map ([dfcadec](https://github.com/hirosystems/ordhook/commit/dfcadec6803c01584067772bdd8ba6137348267c))
* revisit log level ([4168661](https://github.com/hirosystems/ordhook/commit/416866123a01eab281998f55839f018e7f47685f))
* revisit transfer loop ([1f2151c](https://github.com/hirosystems/ordhook/commit/1f2151c0987d6f8ce4608973e2c0cb8d23a0db71))
* rocket_okapi version ([2af31a8](https://github.com/hirosystems/ordhook/commit/2af31a8e644abc8132db1091985f8ea6ba2bbc91))
* safer db open, dockerfile ([43d37d7](https://github.com/hirosystems/ordhook/commit/43d37d73f231e373a3a6f276ba1e28a697d76f13))
* safer error handling ([11509e4](https://github.com/hirosystems/ordhook/commit/11509e44351a8036d13a793d89b69126bf8f043f))
* sat offset computation ([b278b66](https://github.com/hirosystems/ordhook/commit/b278b66f84ef784164f42c04f0c4f70a389707a4))
* sats overflow handling ([a3f745c](https://github.com/hirosystems/ordhook/commit/a3f745cfa78f742d85c3cf9248c83e90c1064e91))
* schema for curse_type ([72d43c6](https://github.com/hirosystems/ordhook/commit/72d43c6b414a58523df6b861de0720de0e01f8fe))
* serialize handlers in one thread ([cdfc264](https://github.com/hirosystems/ordhook/commit/cdfc264cff01b48e4f62fbddf354188a09ec36d2))
* slow down initial configuration ([3096ad3](https://github.com/hirosystems/ordhook/commit/3096ad3b26b89c4fab8c4e249c24948d87968f26))
* sql query ([1a3bc42](https://github.com/hirosystems/ordhook/commit/1a3bc428ea3630041121e0cd77234a66fd576439))
* sql query bis ([a479884](https://github.com/hirosystems/ordhook/commit/a4798848b1c325b8bfeda554b28c6202e5ebed91))
* sql request ([6345df2](https://github.com/hirosystems/ordhook/commit/6345df265260b114767e09fa5f04d90e3eeec41d))
* sql table setup ([c8884a7](https://github.com/hirosystems/ordhook/commit/c8884a7dbec2b5eed91aec917f61313f63d8b17f))
* stack overflow ([aed7d5d](https://github.com/hirosystems/ordhook/commit/aed7d5d0058dbbb24c833040fa4ef766ec3e4cab))
* stacks predicate format ([fcf9fb0](https://github.com/hirosystems/ordhook/commit/fcf9fb0e3f618e03dff0bc69346d84c8cc0ad13f))
* start_block off by one ([b99f7b0](https://github.com/hirosystems/ordhook/commit/b99f7b001197158523b738ff5f2e503652796397))
* streamline txid handling ([ad48351](https://github.com/hirosystems/ordhook/commit/ad4835104406310d427e89b72f24f0de068d82ed))
* test suite ([c7672f9](https://github.com/hirosystems/ordhook/commit/c7672f91a1e152d5b58435d4cda7b9d36b368d32))
* test warns and errors ([0887d6b](https://github.com/hirosystems/ordhook/commit/0887d6b8cae3b6cfe153a274b429a5e54aed42a4))
* threading model ([c9c43ae](https://github.com/hirosystems/ordhook/commit/c9c43ae3e3b0bb3ae0e3a28da7a885e8bd798162))
* threading model ([c2354fc](https://github.com/hirosystems/ordhook/commit/c2354fcacd407f3096989d57250047c0ae4df5c4))
* track interrupted scans ([2b51dca](https://github.com/hirosystems/ordhook/commit/2b51dca8f32a22838fc043a7e8598477506a46a8))
* transaction type schema ([c35a737](https://github.com/hirosystems/ordhook/commit/c35a737ed2949dbf4d58a50210b2c2601a225349))
* transfer recomputing commit ([3643636](https://github.com/hirosystems/ordhook/commit/364363680ffc0c7a28dd2ef17271d5a758ffa2d0))
* transfer tracking ([0ea85e3](https://github.com/hirosystems/ordhook/commit/0ea85e3d2005436022c025b728f1b7b4c7a156b4))
* transfer tracking ([30f299e](https://github.com/hirosystems/ordhook/commit/30f299ef7c29fc5e0bfff084c1c990e26bfee768))
* transfer tracking ([0cd29f5](https://github.com/hirosystems/ordhook/commit/0cd29f592597d79f5084efe0dee9bd8bdd90693a))
* transfer tracking + empty blocks ([dc94875](https://github.com/hirosystems/ordhook/commit/dc948755b29e6ec20925dabb0bfe717667a5435f))
* traversals algo ([e8ee3ab](https://github.com/hirosystems/ordhook/commit/e8ee3ab0362f8d86ca613678aaa957117709e412))
* tweak rocksdb options ([a0a6950](https://github.com/hirosystems/ordhook/commit/a0a69502d8507be14afb548f5e525fcd3e1be78e))
* typo ([b0498bb](https://github.com/hirosystems/ordhook/commit/b0498bb048c3d674e9d1b5fcbcfc9ea9078f6627))
* typo ([baa773f](https://github.com/hirosystems/ordhook/commit/baa773ff4dabc0cde23fac51fc3f62233723a18b))
* unexpected expectation ([7dd362b](https://github.com/hirosystems/ordhook/commit/7dd362b4f52f2b7faee3a7ad81eb47a4defe986b))
* unify rosetta operation schemas ([bf3216b](https://github.com/hirosystems/ordhook/commit/bf3216b10061adc8774a4020cd8aee5e7f7a7354))
* unused imports ([3aab402](https://github.com/hirosystems/ordhook/commit/3aab4022ab093322069e477cef21bbf6291556ac))
* update chainhook schema ([4e82714](https://github.com/hirosystems/ordhook/commit/4e8271491b1e6f7ead3dcaf3859063611adb5f48))
* update inscription_number ([89b94e7](https://github.com/hirosystems/ordhook/commit/89b94e7d5db40536a9bcf7ea4b73f775824bb414))
* update license ([6ebeb77](https://github.com/hirosystems/ordhook/commit/6ebeb77d6a0f7a7226b29ec8e97298744af6d0ef))
* update rust version in docker build ([fab6f69](https://github.com/hirosystems/ordhook/commit/fab6f69df5241f02aee8e6b785d0a9c66a3cdad6))
* update spec status ([e268925](https://github.com/hirosystems/ordhook/commit/e2689255b7bae3bb204b9df201b1bf30e63f8e79))
* update/pin dependencies ([#311](https://github.com/hirosystems/ordhook/issues/311)) ([f54b374](https://github.com/hirosystems/ordhook/commit/f54b374b2452f6e8c742a10bcfc2b9b5a4a6a363)), closes [#310](https://github.com/hirosystems/ordhook/issues/310)
* use first input to stick with ord spec interpretation / implementation ([206678f](https://github.com/hirosystems/ordhook/commit/206678f0d157ad9e5e5969ff9079508c93285e61))
* use rpc instead of rest ([1b18818](https://github.com/hirosystems/ordhook/commit/1b188182f12fd46b13be4a2fda90d8f6c9da3fe1))
* zeromq, subsidy issue ([dbca70c](https://github.com/hirosystems/ordhook/commit/dbca70c197f32ca2c32e92f122a77913822777f7))


### Reverts

* Revert "chore: tmp patch" ([3e022ca](https://github.com/hirosystems/ordhook/commit/3e022ca322ef13057dd4b4f78a873537de3200e0))
