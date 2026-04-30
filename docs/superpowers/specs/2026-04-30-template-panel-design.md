# 内置模板面板设计

## 背景

用户需要快速将预置的 HTML 组件片段（轮播图、背景图、登录表单等）插入到当前编辑的文档中，同时也能打开完整的模板文件进行编辑。模板来自特定目录（如 `C:\Users\RaWal\Desktop\templateV-3`），目录路径可配置。

## 需求

### 核心功能

1. **左侧面板新增"内置模板" tab**：与"文件""DOM 树"并列，共三个 tab
2. **模板目录可配置**：用户可在设置中指定模板根目录路径
3. **组件列表展示**：从模板目录的 `template.json` 读取配置，展示模板名称和组件列表
4. **单击组件 → 插入片段**：提取组件的 HTML 片段，插入到当前文档 DOM 树中选中节点的下方
5. **双击模板名 → 打开编辑**：加载整个模板文件进入编辑模式（与打开普通文件相同）

### template.json 格式

放在每个模板子目录下，格式：

```json
{
  "name": "登录页模板 V3",
  "file": "index.html",
  "baseUrl": "https://cloud.21tb.com/login/custom/templateV-3",
  "components": [
    { "name": "背景图", "selector": ".elp-login-bg", "icon": "🖼️" },
    { "name": "Logo", "selector": ".logo_box", "icon": "🏷️" },
    { "name": "登录表单", "selector": ".login-form", "icon": "📝" },
    { "name": "国际化组件", "selector": ".login-i18n-div-index", "icon": "🌐" },
    { "name": "注册链接", "selector": ".login-shuoming", "icon": "🔗" },
    { "name": "Copyright", "selector": ".copyright_box", "icon": "©️" },
    { "name": "扫码组件", "selector": ".erwei-box", "icon": "📱" },
    { "name": "轮播图", "selector": ".lunbo", "icon": "🎠" }
  ]
}
```

`icon` 字段可选，用于在列表中显示。`baseUrl` 字段用于将模板中的相对路径（`src`、`href`）重写为可访问的完整 URL。

### URL 重写规则

模板中的资源路径需要在预览和插入时重写为完整 URL：

- `images/bg.jpg` → `https://cloud.21tb.com/login/custom/templateV-3/images/bg.jpg`
- `newLogin/css/swiper.min.css` → `https://cloud.21tb.com/login/custom/templateV-3/newLogin/css/swiper.min.css`

规则：如果 `src` 或 `href` 是相对路径（不以 `http`、`/`、`data:` 开头），则拼接 `baseUrl` + `/` + 原路径。

重写发生在：
1. **预览模板时**：打开模板文件后，渲染预览前对所有元素的 `src`/`href` 进行重写
2. **插入组件时**：提取的 HTML 片段中的相对路径重写为绝对路径

### 模板目录结构

```
<模板根目录>/           (用户配置的路径)
  templateV-3/
    index.html
    template.json
    images/
      bg.jpg
      logo.png
      style.css
  templateV-4/
    index.html
    template.json
    ...
```

### 插入逻辑

1. 用户在 DOM 树中选中一个节点
2. 在"内置模板" tab 中单击某个组件
3. 用 parse5 解析模板 HTML，按 selector 找到目标元素
4. 将目标元素及其子树序列化为 HTML 字符串
5. 重新解析为 DomNode 树（分配新 ID）
6. 插入到当前选中节点的 children 末尾（如果是元素节点）或父节点的 children 末尾（如果是文本/注释节点）
7. 标记文档为 dirty

### 未选中节点时的行为

如果当前没有选中 DOM 节点，组件插入到 domTree 根节点的最后一个元素的 children 末尾（通常是 body 的末尾）。

### 模板目录配置

- 通过 Tauri 的文件对话框选择目录
- 配置路径存储在 `localStorage`
- 首次打开"内置模板" tab 时，如果未配置目录，显示"请配置模板目录"提示和配置按钮

## 技术方案

### 新增文件

1. **`src/components/TemplatePanel.vue`**：内置模板 tab 的 UI 组件
2. **`src/stores/template.ts`**：模板状态管理（目录路径、模板列表、组件列表）
3. **`src/composables/useTemplateParser.ts`**：解析模板 HTML 并按选择器提取组件片段

### 修改文件

1. **`src/components/LeftPanel.vue`**：新增"内置模板" tab
2. **`src/stores/domTree.ts`**：新增 `insertNodes(parentId, nodes)` 方法

### 组件提取实现

```typescript
// useTemplateParser.ts
function extractComponent(html: string, selector: string): string {
  // 1. 用 parse5 解析 HTML
  // 2. 遍历 AST 找到匹配 selector 的元素
  // 3. 序列化该元素及其子树为 HTML 字符串
  return componentHtml
}
```

选择器匹配需要支持：
- `.classname`（class 选择器）
- `#id`（ID 选择器）
- `tagname`（标签选择器）

### UI 设计

```
┌─────────────────┐
│ 文件 | DOM 树 | 内置模板 │  ← 三个 tab
├─────────────────┤
│ 📂 登录页模板 V3     │  ← 模板名（双击打开编辑）
│   🖼️ 背景图          │  ← 组件（单击插入）
│   🏷️ Logo            │
│   📝 登录表单         │
│   🌐 国际化组件       │
│   🔗 注册链接         │
│   ©️ Copyright        │
│   📱 扫码组件         │
│   🎠 轮播图           │
├─────────────────┤
│ ⚙️ 配置模板目录       │  ← 底部设置按钮
└─────────────────┘
```

## 非目标

- 不支持组件的嵌套选择器（如 `.parent > .child`）
- 不支持模板内组件的实时编辑（只能编辑整个模板）
- 不支持组件拖拽排序
