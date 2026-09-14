# Brain for DeepSeek Harness

English | [中文](README.zh.md)

Give this sentence to your Agent:

> Read https://raw.githubusercontent.com/Missher12/dsh-missher-brain/v0.1.2/AGENT.md, install Brain 0.1.2 into my official Harness web profile, and verify Settings → Memory & Learning while preserving existing data.

Or install with one command:

```sh
dsh plugin --profile web add https://github.com/Missher12/dsh-missher-brain/releases/download/v0.1.2/dsh-missher-brain-0.1.2.tgz
```

**Release availability:** 0.1.2 is prepared for publication. The fixed command becomes available after that Release asset is published; DSH Market installation additionally requires catalog approval. A repository or local package alone does not make the plugin listed.

## What Brain does

Brain combines contributions from Memory and MSE into one bounded, source-attributed recall message. It supplies the `missherBrain` service and the ordinary **Settings → Memory & Learning** section (`brain`). It does not create a memory database, train a model, or add another workspace panel.

Install Memory and MSE separately when needed. Each provider owns its data and project/privacy rules. Without a registered provider, Brain adds no recall and the settings overview shows the provider as unavailable. Recalled content is untrusted background information, never authorization or higher-priority instructions.

## Compatibility and verification

Version **0.1.2** targets official **DeepSeek Harness 0.1.5-rc.2** and **Cordis 4.0.2**, with Node `^22.19.0 || >=24.0.0`. A compatible Desktop uses that same Host and the ordinary Settings entry; no specific Desktop installer is included in this package. Do not install alongside another plugin that already provides `missherBrain`.

After installation, restart or reload the selected Host, open **Settings → Memory & Learning**, and check the registered provider states. A successful install command or composed configuration is not proof that the Settings view loaded. If the page is missing, check the selected profile, exact Host version and plugin load diagnostics. Brain adds no standalone tool that an Agent must invoke.

DSH Market and the command above use the same versioned Release archive. Match the package name `dsh-missher-brain`, version and published checksum before installing; the release publisher and catalog maintainer own availability.

## Recall limits

Recall runs on the first step of each top-level turn containing direct user text and a project working directory. Providers receive a hashed project identity. Deterministic ordering and normalized-text deduplication select at most **6 items / 4,000 UTF-8 bytes**, including the safety wrapper. The preparation/acceptance deadline defaults to **150 ms**; provider-status reads default to **300 ms**.

Only selected handles are accepted. Failures, late results and canceled work fail open; a stuck provider cleanup does not block the agent. Providers must observe cancellation and keep acceptance atomic. Brain cannot undo a provider's already committed side effects. The official agent loop logs the single recall message with the `missher-brain` source before including it in a model request.

## Configuration

Optional profile patch fields lower the item/byte budgets or adjust the timeouts. All values are validated integers; the complete wrapper counts toward the byte budget.

```yaml
- id: missher-brain
  config:
    maxItems: 6
    maxBytes: 4000
    timeoutMs: 150
    statusTimeoutMs: 300
```

Allowed ranges are `maxItems` 1–6, `maxBytes` 1–4000, and both timeout fields 1–5000 ms. Smaller byte budgets can legitimately produce no recall.

## Uninstall and reinstall

```sh
dsh plugin --profile web remove dsh-missher-brain
```

Removal detaches Brain, its registered providers, Settings contribution and Remote metadata. It does not delete or migrate Memory/MSE databases or existing session history. Reinstall with the same fixed-version command. Providers using optional Cordis injection can register again when Brain returns; their manual tools and non-Brain behavior remain owned by those plugins.

## Development and license

Use `pnpm install --frozen-lockfile --ignore-scripts`, `pnpm build`, `pnpm typecheck` and `pnpm verify:package`. Focused Client tests are `pnpm exec vitest run tests/apply.client.spec.tsx tests/components.client.spec.tsx --maxWorkers=2`. [Agent installation](AGENT.md), [provider integration](AGENT_INTEGRATION.md) and [verification scope](VALIDATION.md) describe the relevant contracts.

MIT. [LICENSE](LICENSE) retains the original DeepSeek notice; [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) retains the scaffolding notice. [SOURCE_PROVENANCE.json](SOURCE_PROVENANCE.json) records source revisions and hashes. This independently maintained plugin is not an official DeepSeek product.
