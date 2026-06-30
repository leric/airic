# Kernel 如何使用 Pack 文档并组装 Agent Context

> Status: 描述当前实现的行为契约。若本文与 `src/` 代码冲突，以代码为准。
> 相关文档: [architecture.md](architecture.md)、[kernel-tdd.md](kernel-tdd.md)、[document-id-schema.md](document-id-schema.md)、[history-tree.md](history-tree.md)。

## 1. 两条上下文通道

Kernel 在每一轮 prompt 里向 LLM 提供的 context 由两条**相互独立**的通道组成：

| 通道 | 内容 | 构建者 | 生命周期 |
|---|---|---|---|
| **System prompt** | 静态行为指令：base instruction、active mode、process、tool usage、current document + doc-type spec | `RuntimeContextBuilder.buildSystemPrompt` | 每个工具回合前刷新一次（`refreshSystemPrompt`） |
| **Message history** | 会话历史 = root → cursor 路径上的 user/assistant 文本对 | `projectCursorPath(session)` | 每轮按当前 cursor 投影 |

两者拼在一起才是完整的 agent context。**pack 文档只进入 system prompt 通道**；用户对话只进入 history 通道；用户当前打开的文档是唯一横跨两边的内容（在 system prompt 里以 fenced content 形式出现）。

`RuntimeContextBuilder` 的注释明确写到：「Message history context is `projectCursorPath()` in `domain/session/turn-tree.ts`」。

---

## 2. Pack 文档的分类与角色

Core pack（`.airic/packs/core/`）里有五类文档，每类对应 kernel 的一个不同注入策略：

| 文档类型 | `doc_type` | 文件位置 | 数量 | 在 context 里的角色 |
|---|---|---|---|---|
| Base instruction | — (无 frontmatter) | `base-instruction.md` | 1 | kernel 身份与基础姿态，**常驻** |
| Mode spec | `core.mode` | `mode/*.md` | 多个 | 当前会话的思维风格，**当前 mode 常驻** |
| Document-type spec | `core.document-type` | `document-type/*.md` | 多个 | 一类用户文档的质量标准，**按 doc_type 按需加载** |
| Process spec | `core.process` | `process/*.md` | 多个 | 可复用工作流，**索引常驻、正文按激活加载** |
| Tool usage doc | `core.tool` | `tool/*.md` | 与 kernel 工具 1:1 | 每个系统工具的使用方法论，**全部常驻** |

每类文档的 frontmatter 都用 `id` + `doc_type` 自描述，`core.tool` spec 额外用 `tool:` 字段绑定到一个 kernel 工具名。

---

## 3. System prompt 的组装顺序

`RuntimeContextBuilder.buildSystemPrompt` 按固定顺序拼接以下段落（这是**机制**，属于代码契约，不是文档可编辑的部分）：

```text
[base instruction]                    ← core pack 根目录的 base-instruction.md
## Active Mode                        ← 当前 mode spec 的 body
## Active Process                     ← 当前激活 process spec 的完整 body
                                      （以上二选一：有激活 process 时是这段）
   -- 或 --
## Available Processes                ← 所有 process spec 的紧凑索引
                                      （无激活 process 时是这段）
## Tool Usage                         ← 所有 core.tool 文档拼接
## Current Document                   ← 当前打开文档的 path / doc_type / fenced content
## Document-Type Spec                 ← 当前文档 doc_type 解析到的 spec body
```

对应代码段：

```14:70:src/application/services/runtime-context-builder.ts
  buildSystemPrompt(input: RuntimeContextInput): string {
    const systemParts = [
      input.baseInstruction.trim(),
      "",
      "## Active Mode",
      input.modeSpec.body.trim(),
    ];

    if (input.activeProcessSpec) {
      systemParts.push(
        "",
        "## Active Process",
        input.activeProcessSpec.body.trim(),
      );
    } else if (input.processIndex.trim().length > 0) {
      systemParts.push(
        "",
        "## Available Processes",
        input.processIndex.trim(),
      );
    }

    if (input.toolUsage && input.toolUsage.trim().length > 0) {
      systemParts.push("", "## Tool Usage", input.toolUsage.trim());
    }

    if (input.currentDocument) {
      systemParts.push(
        "",
        "## Current Document",
        `Path: ${input.currentDocument.relativePath}`,
      );

      if (input.currentDocument.docType) {
        systemParts.push(`doc_type: ${input.currentDocument.docType}`);
      }

      systemParts.push(
        "",
        "```markdown",
        input.currentDocument.content.trim(),
        "```",
      );

      if (input.currentDocument.documentTypeSpec) {
        systemParts.push(
          "",
          "## Document-Type Spec",
          input.currentDocument.documentTypeSpec.body.trim(),
        );
      }
    }

    return systemParts.join("\n");
  }
```

`RuntimeContextInput` 字段 = pack 文档进入 context 的唯一入口；**新增一个字段 = 修改这个函数 = 代码改动**，这是「机制在代码、行为在文档」分界线的具体落点。

---

## 4. 每类文档的加载触发与生命周期

### 4.1 Base instruction — 始终加载
- **触发**：`WorkspaceRuntimeLoader` 启动时一次性读入 `packs/core/base-instruction.md`。
- **位置**：system prompt 开头，无 `##` 标题。
- **刷新**：不刷新（除非重启）。
- **来源代码**：`buildSystemPrompt` 第 17-19 行。

### 4.2 Mode spec — 当前 mode 常驻
- **触发**：会话的 `modeId`（默认 `core.thinking-partner`，由 `config.yml` 的 `default_mode` 决定）。`SelectModeUseCase` 通过 ACP `session/set_mode` 切换。
- **位置**：`## Active Mode`，注入该 mode spec 的完整 body。
- **生命周期**：跨整个会话持续生效，一次只激活一个。
- **重要约束**：mode 是「宽广的会话姿态」，process 只能 refine 不能替换它。

### 4.3 Process spec — 索引常驻、正文按激活
这是最体现「按需加载」设计的一类。Process 有两种状态，对应两段不同的 context：

**未激活状态** → `## Available Processes`：

由 `process-catalog.ts` 把所有 `core.process` spec 压缩成一段紧凑索引，**只包含** frontmatter 里的 `id` / `summary` / `triggers` / `activation`，**不包含正文**。这让普通对话保持便宜。

**激活状态** → `## Active Process`：

当用户用 `/process start <id>` 或 agent 调 `process.start` 工具启动一个 process 时，kernel 创建一个 `ProcessInstance` 并设为 `activeProcessInstanceId`，此时 system prompt 改为注入该 spec 的**完整 body**，**索引段消失**。

- **同时只能有一个 active process**。
- **激活策略**：`activation: manual` 的 process 只能用户启动；`suggested` 的可由 agent 启动，但激活始终可见。
- **生命周期**：`process.complete` / `process.cancel` 清除 active 状态，context 回到索引态。
- **设计意图**：「load small indexes by default, full specs only when active」——避免把所有 process 正文每轮都塞进 prompt。

### 4.4 Tool usage doc — 全部常驻、1:1 绑定
- **触发**：`tool-usage-catalog.ts` 在每轮把**所有** `core.tool` spec 拼接成 `## Tool Usage` 段。
- **绑定方式**：每个 `core.tool` 文档的 frontmatter `tool:` 字段必须匹配一个注册的 kernel 工具名（`ALL_KERNEL_TOOL_NAMES`）。
- **同步守卫**：`tests/tool-usage-catalog.test.ts` 强制每个 kernel 工具名有且仅有一份 `core.tool` 文档。
- **两层工具模型**：
  - **可调用契约**（name、JSON schema、policy、confirmation flags）= 代码，在 `src/infrastructure/tools/`
  - **使用方法论**（when / why / how to combine）= `core.tool` 文档，在 `packs/core/tool/`
- **跨工具创意用法**：不在 `core.tool` 里写，而是写在 mode / process 的正文里叠加上去。

### 4.5 Document-type spec — 按 doc_type 按需加载
这是唯一一类由**用户文档**触发加载的 pack 文档：

1. ACP 客户端 open/focus 一个 markdown 文件 → `OpenDocumentUseCase` 设置 `session.currentDocument`。
2. 解析 frontmatter，若有 `doc_type` 且能解析到 `SpecRegistry` 里的一个 spec id，则把该 spec body 注入 `## Document-Type Spec`。
3. 当前文档内容本身以 fenced markdown 形式注入 `## Current Document`，path 和 doc_type 标在前面。
4. **每个工具回合前**通过 `refreshSystemPrompt()` 重新读盘，因为工具调用可能改了文件。

**关键不变式**：
- 没有 `doc_type` 的用户文件 = 普通文件，不加载任何 spec。
- 解析方式 = 把 `doc_type` 值当作 spec id 直接 lookup，**无 metadata 依赖**。
- 用户文档不进入任何 pack 索引；pack 文档不进入用户文档目录。

---

## 5. Message history 通道（与 pack 文档无关，但属于完整 context）

pack 文档不参与 history 通道，但理解它才能理解整个 context 组装：

- 会话存储为 turn tree（`TurnNode.parentId`），不是线性数组。
- 每轮取 `root → currentTurnId` 路径上的节点，**只发 user/assistant 文本对**。
- **被排除**：兄弟分支、`toolTrace`（每个 turn 的完整工具调用记录）。
- 这是 kernel 的「anti-pollution」机制——避免历史工具噪音和岔路污染当前上下文。
- [history-tree.md](history-tree.md) 描述的未来扩展（summarize 顶替、cursor 移动、mark 锚点）都在这条通道里做，不影响 system prompt 通道。

---

## 6. Pack 文档的定位机制（ID → path）

Kernel 不需要 metadata 就能找到任何一份 pack 文档，靠的是 [document-id-schema.md](document-id-schema.md) 定义的机械映射：

```text
core.mode.thinking-partner       → .airic/packs/core/mode/thinking-partner.md
core.document-type.task          → .airic/packs/core/document-type/task.md
core.process.session-reflection  → .airic/packs/core/process/session-reflection.md
core.tool.read                   → .airic/packs/core/tool/read.md
core.base-instruction            → .airic/packs/core/base-instruction.md
```

规则：ID 的 `.` 替换为 `/`，相对于 pack 的 base 目录解析；末段无 `.` 则自动加 `.md`。映射是**双向可逆**的，且对所有 namespace（`airic` / `{pack}` / `ws`）一致。

这意味着：
- `doc_type: core.decision` 直接当 spec id lookup，路径自动算出。
- 文档之间互引用（`references:` / `depends_on:`）也用同一套 ID，无需额外配置。

---

## 7. 设计原则汇总

把以上用法抽象成几条不变式，供 core pack 设计讨论时引用：

1. **两条通道分离**：行为指令走 system prompt，对话走 cursor path，互不穿插。
2. **按需加载层级**：base / mode / tool usage 常驻；process 索引常驻但正文按激活；document-type spec 按 doc_type 触发。
3. **索引 vs 正文**：process 在未激活时只暴露 `id` / `summary` / `triggers` / `activation`，让普通对话便宜。
4. **1:1 绑定 + 同步守卫**：`core.tool` 与 kernel 工具名严格 1:1，靠测试钉死，避免漂移。
5. **机制在代码、行为在文档**：system prompt 的骨架（段落标题、顺序、刷新逻辑）是代码契约；每段的内容是文档。新增段落 = 代码改动。
6. **显式 opt-in**：用户文档只有显式声明 `doc_type` 才进入 typed behavior，否则就是普通文件。
7. **Process refines mode, never replaces**：mode 是会话级姿态，process 是临时叠加的方法，同时只允许一个 active。
8. **Anti-pollution history**：history 永远是 cursor path 投影，不是平铺全量，工具 trace 默认不进 context。
9. **每轮刷新当前文档**：因为工具可能改盘上文件，`refreshSystemPrompt` 在每个 tool round 前重读 current document 段。
10. **无 metadata 依赖**：ID→path 机械映射，doc_type 解析即 spec id lookup，pack 注册只需 `config.yml` 一行 base 目录。
