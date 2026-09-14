# Project context

`dsh-missher-brain` is an independent Bundle for official Harness `0.1.5-rc.2` / Cordis `4.0.2`. Version `0.1.2` exposes the ordinary Memory & Learning Settings section and one shared logged recall path. It owns no provider database and adds no separate workspace UI.

[Host entry](src/index.ts) owns configuration, service registration and the pre-step listener. [Provider contracts](src/contracts.ts), [registry](src/registry.ts), [arbitration](src/arbiter.ts) and [injection](src/injection.ts) separate protocol v1, disposal, deterministic budgets and adoption. [Client entry](src/client/index.ts) owns the Settings contribution and Remote cleanup. [Build script](scripts/build.mjs) generates metadata with the official Typert generator and emits a browser module-loader artifact.

[Installation](README.md), [Agent instructions](AGENT.md) and [provider integration](AGENT_INTEGRATION.md) are the public entrypoints. [Validation](VALIDATION.md) distinguishes focused Client checks from inherited unchanged-Host evidence. [Source provenance](SOURCE_PROVENANCE.json) and both license notices retain attribution.
