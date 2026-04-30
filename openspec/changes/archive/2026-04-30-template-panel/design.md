## Context

当前左侧面板有"文件"和"DOM 树"两个 tab。用户需要快速从预置模板中插入组件片段到当前文档，并支持打开完整模板编辑。模板资源（CSS、图片）需要通过 baseUrl 重写为完整 URL 才能在线访问。

## Goals / Non-Goals

**Goals:**
- 左侧面板新增"内置模板" tab，展示模板目录中的组件列表
- 单击组件插入 HTML 片段到当前文档
- 双击模板名打开完整模板编辑
- 模板目录路径可配置（localStorage 持久化）
- 模板资源路径按 baseUrl 自动重写

**Non-Goals:**
- 不支持嵌套选择器（`.parent > .child`）
- 不支持组件拖拽排序
- 不支持模板在线同步（只读本地文件）

## Decisions

### 1. 模板配置格式

每个模板子目录下放 `template.json`：
```json
{
  "name": "登录页模板 V3",
  "file": "index.html",
  "baseUrl": "https://cloud.21tb.com/login/custom/templateV-3",
  "components": [
    { "name": "背景图", "selector": ".elp-login-bg", "icon": "🖼️" }
  ]
}
```

### 2. URL 重写

相对路径（不以 `http`、`/`、`data:` 开头）自动拼接 `baseUrl` + `/` + 原路径。重写范围：`src` 和 `href` 属性。发生在预览模板和插入组件时。

### 3. 组件插入目标

- 有选中节点：插入到选中节点的 children 末尾
- 无选中节点：插入到 body 元素的 children 末尾

### 4. 选择器匹配

支持三种基础选择器：`.classname`、`#id`、`tagname`。使用 parse5 AST 遍历实现匹配。

### 5. 模板目录配置

- 通过 Tauri 文件对话框选择目录
- 路径存储在 localStorage（key: `template-dir`）
- 首次打开 tab 无配置时显示引导提示

## Risks / Trade-offs

- parse5 解析 FreeMarker 模板时可能遇到语法错误（如 `<#if>`），需做容错处理
- URL 重写可能误改不需要重写的路径（如已是完整 URL 的路径），通过判断前缀规避
