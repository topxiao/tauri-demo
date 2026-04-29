# HTML 可视化编辑器 — 设计文档

## 概述

基于 Tauri v2 + Vue 3 + Rust 的跨平台桌面客户端，用于可视化编辑 HTML 页面并实时预览。前端驱动架构：Vue 负责全部 HTML 解析、DOM 操作和 CSS 编辑，Rust 仅负责文件 I/O。

## 技术栈

| 层 | 选型 | 用途 |
|---|---|---|
| 桌面壳 | Tauri v2 (Rust) | 跨平台窗口、文件系统访问 |
| 前端框架 | Vue 3 + TypeScript + Vite | UI 构建 |
| UI 组件库 | Element Plus | 树组件、表单、颜色选择器等 |
| HTML 解析 | parse5 | 保真解析/序列化 HTML |
| CSS 解析 | css-tree | 解析/编辑/序列化 CSS 规则 |
| 状态管理 | Pinia | 全局状态 + undo/redo |

## 项目结构

```
tauri-demo/
├── src/                        # Vue 前端
│   ├── components/
│   │   ├── FileExplorer.vue        # 左侧文件树
│   │   ├── DomTree.vue             # 左侧 DOM 树
│   │   ├── PreviewPane.vue         # 中间 iframe 预览
│   │   ├── StyleEditor.vue         # 右侧样式编辑
│   │   └── DomNodeEditor.vue       # DOM 节点属性编辑弹窗
│   ├── stores/
│   │   ├── project.ts              # 项目/文件状态
│   │   ├── domTree.ts              # DOM 树数据
│   │   └── styleState.ts           # 样式编辑状态
│   ├── composables/
│   │   ├── useHtmlParser.ts        # HTML ↔ DOM 树转换
│   │   ├── useCssEditor.ts         # CSS 读写
│   │   └── useIframeSync.ts        # iframe 通信
│   ├── utils/
│   │   ├── htmlSerializer.ts       # DOM 树 → HTML 字符串
│   │   └── cssSerializer.ts        # CSS 对象 → CSS 字符串
│   ├── App.vue
│   └── main.ts
├── src-tauri/                  # Rust 后端
│   └── src/
│       └── main.rs                 # Tauri 入口 + 文件 I/O commands
├── package.json
└── tauri.conf.json
```

## Rust 后端职责

仅文件 I/O，不做任何 HTML/CSS 解析：

- `open_folder` → 选择并返回文件夹路径
- `read_file(path)` → 读取文件内容返回字符串
- `write_file(path, content)` → 将内容写入文件
- `list_files(dirPath)` → 递归列出文件夹下的文件树
- `watch_file(path)` → 监听文件外部变更（可选，V1 可不做）

## 核心数据结构

### DomNode

```typescript
interface DomNode {
  id: string                          // 前端生成的唯一 ID
  type: 'element' | 'text' | 'comment'
  tagName?: string                    // div, span, p...
  attributes?: Record<string, string> // class, id, src, href...
  textContent?: string                // 文本节点内容
  children?: DomNode[]
  sourceLocation?: {
    startOffset: number
    endOffset: number
  }
  computedStyles?: Record<string, string>
}
```

### CSS 数据模型

css-tree 将 CSS 解析为 AST，编辑操作直接修改 AST 节点。每个 CSS 来源维护独立的 AST 引用：

- **内联样式**：DomNode.attributes.style 字符串 → 按分号拆分为键值对对象
- **`<style>` 标签**：css-tree 解析 `<style>` 内容 → CssAst
- **外部 CSS 文件**：Rust read_file → css-tree 解析 → CssAst + 文件路径映射

## 数据流

```
打开文件夹 → Rust list_files → 前端构建文件树
点击 HTML 文件 → Rust read_file → parse5 解析 → 构建 DomNode 树
                                                ↓
左侧 DOM 树渲染 ← DomNode[] → Pinia store
                                ↓
点击 DOM 节点 → postMessage → iframe 高亮元素 → iframe 返回 computedStyles
                                                    ↓
右侧样式编辑 ← computedStyles + CSS 规则匹配 ← css-tree 解析各来源 CSS
                                ↓
编辑样式 → 更新 CSS AST → 同步到 iframe 实时预览
                                ↓
保存 Ctrl+S → htmlSerializer 序列化 + cssSerializer 序列化 → Rust write_file
```

## iframe 通信协议

通过 postMessage 双向通信，注入 `data-node-id` 属性关联 DOM 树节点和 iframe 元素。

| 方向 | 事件 | 数据 |
|------|------|------|
| 主页面→iframe | `highlight` | `{ nodeId, tagName }` |
| 主页面→iframe | `unhighlight` | `{ nodeId }` |
| 主页面→iframe | `updateStyles` | `{ nodeId, styles }` |
| 主页面→iframe | `updateStructure` | 完整 HTML 内容 |
| iframe→主页面 | `elementClicked` | `{ nodeId }` |
| iframe→主页面 | `selectionChanged` | `{ computedStyles }` |

## UI 面板设计

### 左侧面板（标签页切换）

**文件树标签：**
- 展示文件夹结构，HTML 文件可点击切换编辑
- 非 HTML 文件灰色展示，不可编辑
- 当前编辑的文件高亮

**DOM 树标签：**
- 工具栏：添加节点 / 删除 / 排序模式
- 树节点按 HTML 层级缩进，可折叠展开
- 选中节点高亮，对应 iframe 元素高亮
- 右键菜单：添加子节点 / 编辑属性 / 复制 / 删除
- 拖拽排序：改变节点在同级中的顺序
- 双击文本节点直接编辑内容

### 中间预览区

- 通过 `srcdoc` 属性将 HTML 内容注入 iframe，无需本地服务器
- 选中 DOM 树节点后，iframe 中对应元素显示蓝色边框高亮
- iframe 中点击元素反向选中 DOM 树节点
- 顶部状态栏显示当前预览文件名和选中元素

### 右侧样式编辑器

**顶部：** 显示选中元素的标签名和 class/id

**样式来源 Tab（三个标签页）：**
- 内联样式：编辑元素的 `style` 属性
- `<style>` 标签：编辑 HTML 内 `<style>` 中的匹配规则
- 外部 CSS：编辑 .css 文件中的匹配规则

每个 Tab 显示数字徽章，表示该来源匹配的规则数量。每个 Tab 下展示匹配的 CSS 规则列表，每条规则显示选择器名、文件位置、属性列表。

**可折叠样式属性分组：**
- 布局：display、position、width、height
- Flexbox：flex-direction、justify-content、align-items（仅 display:flex 时显示）
- 间距：margin、padding（含可视化盒模型图）
- 排版：font-family、font-size、font-weight、line-height、text-align、color
- 背景：background-color（含颜色选择器）
- 边框：border-width、border-style、border-color、border-radius
- 自定义属性：自由添加任意 CSS 属性键值对

每个属性同时提供输入框和常用值下拉选择。

### 添加/编辑节点弹窗（DomNodeEditor）

- 标签类型：下拉选择（div, span, p, h1-h6, a, img, ul/li 等）+ 自定义输入
- 属性编辑：动态增删键值对行
- 文本内容：多行输入

## CSS 编辑策略

### 三种来源的处理

| 来源 | 解析 | 编辑 | 保存 |
|------|------|------|------|
| 内联 `style=""` | 拆分 style 属性字符串为键值对 | 修改 DomNode.attributes.style | 随 HTML 序列化 |
| `<style>` 标签 | css-tree 解析为 CSS AST | 修改 AST 中的 Declaration | 随 HTML 序列化 |
| 外部 `.css` | Rust read_file → css-tree 解析 | 修改 AST，记录文件路径 | Rust write_file |

### 选择器匹配

前端根据选中元素的 tagName、class、id 对 CSS AST 中的选择器做匹配。V1 支持简单选择器精确匹配（`.class`、`#id`、`tagName`），不做完整的 CSS specificity 计算。

### 编辑操作

- 修改属性值 → 更新 CSS AST 中对应 Declaration
- 新增属性 → 在已有规则末尾追加 Declaration
- 删除属性 → 从 AST 中移除 Declaration
- V1 不支持新增 CSS 规则/选择器，只能编辑已有规则中的属性

## 保存策略

### HTML 序列化

parse5 保留原始格式信息（缩进、空行、注释），序列化时原样还原。流程：

1. DOM 树变更 → 更新 parse5 AST 中对应节点
2. `<style>` 内 CSS 变更 → css-tree 序列化 → 写回 `<style>` 标签文本
3. 内联 style 变更 → 序列化为 style 字符串 → 写入元素属性
4. parse5 序列化完整 AST → HTML 字符串
5. 外部 CSS 变更 → css-tree 序列化 → CSS 字符串
6. Rust write_file 写入对应文件

### 防丢失保护

- 切换文件时，如有未保存变更，弹窗提示保存
- 关闭窗口时同理
- 自动保存默认关闭，用户可在设置中开启

## Undo/Redo

Pinia 插件实现，每次 DOM 或 CSS 变更前 push 操作快照。Ctrl+Z 撤销，Ctrl+Y 重做。

## 错误处理

- 文件读取失败 → Toast 提示，不 crash
- HTML 解析失败 → 尝试宽松解析，提示用户
- CSS 解析失败 → 跳过该规则，标记为"无法解析"
- 写入失败 → Toast 提示，内存中变更不丢失

## V1 范围

### 包含

- 导入文件夹，文件树展示
- 多 HTML 文件切换编辑
- DOM 树展示、选中、折叠展开
- DOM 节点增删改（标签、属性、文本内容）
- 拖拽排序
- 内联样式 + `<style>` + 外部 CSS 编辑
- iframe 实时预览 + 元素高亮
- Ctrl+S 保存
- Undo/Redo

### 不包含（后续迭代）

- CSS 选择器编辑/新增
- JavaScript 编辑
- 响应式预览（不同设备尺寸模拟）
- 多标签页同时编辑
- 图片/资源预览
- 主题/暗色模式
- 插件系统
- 代码编辑器模式
