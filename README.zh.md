# DeepSeek Harness Brain

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

[English](README.md) | 中文

把这一句话交给你的 Agent：

> 请阅读 https://raw.githubusercontent.com/Missher12/Missher-DSH-Brain/v0.1.2/AGENT.md，将 Brain 0.1.2 安装到我的官方 Harness web profile，验证“设置 → 记忆与学习”，并保留已有数据。

也可以直接运行一条安装命令：

```sh
dsh plugin --profile web add https://github.com/Missher12/Missher-DSH-Brain/releases/download/v0.1.2/dsh-missher-brain-0.1.2.tgz
```

**发布状态：**0.1.2 已准备发布；固定安装命令在对应 Release 资产发布后可用，DSH Market 安装还需要目录审核通过。只有仓库或本地安装包，不代表插件已经上架。

## Brain 的作用

Brain 将 Memory 与 MSE 的贡献合并成一条有界、带来源的召回消息，提供 `missherBrain` 服务和普通的“**设置 → 记忆与学习**”分区（`brain`）。它不创建记忆数据库、不训练模型，也不增加另一套工作区面板。

按需单独安装 Memory 和 MSE，各 provider 保留自己的数据、项目隔离与隐私规则。没有注册 provider 时，Brain 不增加召回，设置概览会显示对应 provider 不可用。召回内容只是不可信背景信息，不构成授权或更高优先级指令。

## 兼容与验证

**0.1.2** 面向官方 **DeepSeek Harness 0.1.5-rc.2** 与 **Cordis 4.0.2**，Node 要求为 `^22.19.0 || >=24.0.0`。兼容的 Desktop 使用相同 Host 和普通 Settings 入口；本包不包含特定 Desktop 安装器。不要与另一个已经提供 `missherBrain` 的插件同时安装。

安装后重启或重新加载所选 Host，打开“**设置 → 记忆与学习**”，核对已注册 provider 的状态。安装命令成功或配置已组合，不等于设置页面已经加载。若页面缺失，请检查所选 profile、准确 Host 版本及插件加载诊断。Brain 不增加需要 Agent 单独调用的工具。

DSH Market 与上述命令使用相同的固定版本 Release 归档。安装前核对包名 `dsh-missher-brain`、版本和公开校验和；实际可用性由发布者与目录维护者确认。

## 召回限制

召回只在含直接用户文本及项目工作目录的顶层回合第一步运行，provider 收到的是哈希后的项目身份。稳定排序与规范化文本去重最多选择 **6 条 / 4,000 UTF-8 字节**，包含安全说明。准备/接纳时限默认为 **150 ms**，provider 状态读取默认为 **300 ms**。

只有选中的 handle 会被接纳；失败、迟到或取消的工作会放行会话，卡住的 provider 清理不会阻塞 Agent。Provider 必须响应取消并保持接纳原子性，Brain 无法撤销 provider 已提交的副作用。官方 Agent 循环在将单条召回纳入模型请求前，以 `missher-brain` 来源记录它。

## 配置

可选 profile 补丁可以降低条数/字节预算或调整超时。所有值均校验为整数，完整安全说明也计入字节预算。

```yaml
- id: missher-brain
  config:
    maxItems: 6
    maxBytes: 4000
    timeoutMs: 150
    statusTimeoutMs: 300
```

允许范围为 `maxItems` 1–6、`maxBytes` 1–4000，两个超时字段均为 1–5000 ms。字节预算较小时，没有召回也是正常结果。

## 卸载与重装

```sh
dsh plugin --profile web remove dsh-missher-brain
```

卸载会移除 Brain、provider 注册、Settings 贡献和 Remote 元数据，不会删除或迁移 Memory/MSE 数据库及已有会话历史。重装时使用相同的固定版本安装命令；使用可选 Cordis 注入的 provider 可在 Brain 恢复后重新注册，手动工具及无 Brain 时的行为仍由各插件负责。

## 开发与许可证

使用 `pnpm install --frozen-lockfile --ignore-scripts`、`pnpm build`、`pnpm typecheck` 和 `pnpm verify:package`。定向 Client 测试命令为 `pnpm exec vitest run tests/apply.client.spec.tsx tests/components.client.spec.tsx --maxWorkers=2`。[Agent 安装说明](AGENT.md)、[provider 集成说明](AGENT_INTEGRATION.md)与[验证范围](VALIDATION.md)分别说明相关约定。

采用 MIT 许可证。[LICENSE](LICENSE) 保留原 DeepSeek 声明，[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)保留构建/测试辅助代码的声明，[SOURCE_PROVENANCE.json](SOURCE_PROVENANCE.json)记录源码版本和哈希。本插件独立维护，不属于 DeepSeek 官方产品。
