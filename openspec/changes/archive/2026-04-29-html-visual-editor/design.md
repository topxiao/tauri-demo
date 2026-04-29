## Context

新建 Tauri v2 + Vue 3 桌面应用。项目目录为空，无已有代码和约束。用户需要一个可视化 HTML 编辑器，核心功能是 DOM 树操作 + CSS 样式编辑 + 实时预览。

## Goals / Non-Goals

**Goals:**

- 实现三栏布局的 HTML 可视化编辑器：文件树/DOM树 | iframe 预览 | 样式编辑器
- 支持导入文件夹，多 HTML 文件切换编辑
- DOM 树节点增删改 + 拖拽排序
- 三种 CSS 来源（内联 / `<style>` / 外部 .css）的可视化编辑
- iframe 实时预览 + 元素双向选中高亮
- 保存时保留原始文件格式，直接写回原文件
- Undo/Redo 支持

**Non-Goals:**

- JavaScript 编辑
- CSS 选择器新增/编辑（V1 只编辑已有规则中的属性）
- 响应式预览（不同设备尺寸模拟）
- 多标签页同时编辑
- 暗色模式 / 主题系统
- 代码编辑器模式（纯文本编辑 HTML）

## Decisions

### D1: 前端驱动架构

前端（Vue 3）负责全部 HTML 解析、DOM 操作和 CSS 编辑。Rust 后端仅做文件 I/O。

**理由：** HTML/CSS 编辑的核心是 DOM 操作，前端生态（parse5、css-tree）的成熟度远超 Rust。Tauri 的价值在于跨平台桌面壳和文件系统访问，不需要把 DOM 操作塞进 Rust。

**备选方案：** Rust 驱动（用 tl/scraper crate 解析 HTML）— 开发周期长，HTML 解析库不如前端生态丰富。

### D2: parse5 做 HTML 解析

使用 parse5（而非浏览器 DOMParser）解析和序列化 HTML。

**理由：** parse5 保留源码格式信息（缩进、空行、注释位置），序列化回去不会打乱原始代码。DOMParser 会丢失格式。

**备选方案：** DOMParser — 简单但不保留格式；htmlparser2 — 流式解析，不适合编辑器场景。

### D3: css-tree 做 CSS 解析

使用 css-tree 将 CSS 解析为 AST，编辑操作直接修改 AST 节点。

**理由：** css-tree 同时支持解析和序列化，AST 结构清晰，可以精确操作单个 Declaration。postcss 更重量级，适合构建工具而非编辑器。

### D4: iframe + srcdoc 做实时预览

通过 iframe 的 srcdoc 属性注入 HTML 内容，通过 postMessage 双向通信。

**理由：** srcdoc 无需本地服务器，iframe 隔离保证安全。注入 `data-node-id` 属性关联 DOM 树节点和 iframe 元素。

**备选方案：** webview 单独加载文件 — 需要文件服务器，通信更复杂。

### D5: Element Plus 做 UI 组件库

**理由：** 提供开箱即用的树组件（el-tree）、表单控件（el-input、el-select）、颜色选择器（el-color-picker）、标签页（el-tabs），减少自研 UI 工作量。

### D6: Pinia + 快照插件做 Undo/Redo

每次 DOM 或 CSS 变更前，Pinia 插件记录完整状态快照。

**理由：** 实现简单，对编辑器场景够用。编辑器状态全部在 Pinia store 中，快照覆盖完整。

**备选方案：** 命令模式（记录操作正向/反向）— 更复杂，V1 不需要。

### D7: 简单选择器匹配

V1 仅支持简单选择器精确匹配（`.class`、`#id`、`tagName`），不做完整 CSS specificity 计算。

**理由：** 完整的 CSS 选择器匹配引擎复杂度高（需要处理后代选择器、伪类、媒体查询等）。V1 精确匹配覆盖 80% 的常见用例。

## Risks / Trade-offs

**[大文件性能]** → parse5 处理大型 HTML（>1MB）可能卡顿。缓解：V1 不优化，后续按需引入虚拟滚动或 Web Worker。

**[srcdoc 加载外部资源]** → iframe 通过 srcdoc 加载时，外部 CSS/JS 的相对路径可能无法解析。缓解：注入 `<base>` 标签指定项目文件夹路径，或拦截资源请求。

**[CSS 选择器匹配不完整]** → 复合选择器（如 `div.container > p`）V1 无法匹配。缓解：未匹配的规则不在样式编辑器中展示，但不影响编辑功能。

**[Undo/Redo 内存占用]** → 快照模式对频繁编辑场景内存占用大。缓解：限制快照栈深度（默认 50 步）。

**[格式保真度边界]** → parse5 对极端畸形 HTML 的格式保留可能不完美。缓解：提示用户文件可能有格式问题，正常编辑的 HTML 不受影响。
