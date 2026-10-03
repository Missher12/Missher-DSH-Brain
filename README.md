# Brain for DeepSeek Harness

[← 桌面端与安装包](https://github.com/Missher12/Missher-DeepseekHarness-Desktop) · [全部插件](https://github.com/Missher12/Missher-DeepseekHarness-Desktop/blob/main/plugins/README.zh.md) · [通用安装指南](https://github.com/Missher12/Missher-DeepseekHarness-Desktop/blob/main/docs/cookbook/install-cordis-plugins.zh.md)

## 新手上手：记忆与学习汇总

把 Memory、MSE 等提供者的召回结果整理为一条有来源、有限额的上下文消息。

| 你需要知道的事 | 说明 |
| --- | --- |
| 插件包名 | `dsh-missher-brain` |
| 当前源码版本 | `0.1.2` |
| 装好后在哪里使用 | 设置 → Memory & Learning（记忆与学习） |
| 下载 / 源码 | [下载 0.1.2 安装包](https://github.com/Missher12/Missher-DSH-Brain/releases/tag/v0.1.2) |

### 安装、启用与第一次使用

1. 先从[桌面端主页](https://github.com/Missher12/Missher-DeepseekHarness-Desktop)下载适合电脑的应用，完成模型配置。这个仓库是可选插件，不是独立桌面应用。
2. 阅读[通用安装指南](https://github.com/Missher12/Missher-DeepseekHarness-Desktop/blob/main/docs/cookbook/install-cordis-plugins.zh.md)及本页原有安装说明，核对宿主与插件版本。桌面版使用“插件 → 添加插件”；Web/CLI 使用自己的目标配置组，不混用两种安装位置。
3. 安装后按宿主提示启用并重新加载，进入上表列出的入口。更新已有插件前保留配置和数据，不同时启用旧包名与新包名。
4. 打开设置检查每个提供者是否可用，再在相关项目里检查召回。不要同时启用两个提供同名 missherBrain 服务的插件。

### 使用前了解这些边界

Brain 自身不保存记忆。没有可用的提供者时，安装 Brain 不会自动产生记忆；当前公开验证基线是 Harness 0.1.5-rc.2。

如果页面或功能没出现，先检查当前应用版本、插件是否启用以及加载错误。反馈时附版本、复现步骤和已脱敏错误；不要上传 API Key、真实会话、账号 Cookie 或学习数据库。Git 中的代码更新不会自动替换电脑上已安装的插件。

### 继续阅读

下文保留本插件的详细行为、配置、开发和验证说明。跨平台是否实际通过，以对应版本的验证记录为准；桌面安装包能启动，不代表全部插件和外部服务都已验收。

---

English | [中文](README.zh.md)

Give this sentence to your Agent:

> Read https://raw.githubusercontent.com/Missher12/Missher-DSH-Brain/v0.1.2/AGENT.md, install Brain 0.1.2 into my official Harness web profile, and verify Settings → Memory & Learning while preserving existing data.

Or install with one command:

```sh
dsh plugin --profile web add https://github.com/Missher12/Missher-DSH-Brain/releases/download/v0.1.2/dsh-missher-brain-0.1.2.tgz
```

**Release availability:** [v0.1.2](https://github.com/Missher12/Missher-DSH-Brain/releases/tag/v0.1.2) is published with its tarball and checksum. DSH Market listing remains a separate catalog operation.

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
