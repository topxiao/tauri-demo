# template-panel

## 需求

### REQ-1: 新增"内置模板" tab

LeftPanel.vue 新增第三个 tab "内置模板"，与"文件""DOM 树"并列。点击后显示 TemplatePanel 组件。

### REQ-2: 模板目录配置

- TemplatePanel 底部有"配置模板目录"按钮
- 点击后调用 Tauri 文件对话框选择目录
- 选择的路径存储在 localStorage key `template-dir`
- 未配置时显示"请配置模板目录"提示和配置按钮

### REQ-3: 模板列表加载

- 读取模板根目录下的子目录列表
- 对每个子目录检查是否包含 `template.json`
- 包含的子目录视为一个模板，读取其 `template.json` 配置
- 模板列表以树形展示：模板名为父节点，组件为子节点

### REQ-4: 组件展示

每个组件显示 icon（如有）和名称。组件可单击。

### REQ-5: 单击组件 → 插入 HTML 片段

- 读取模板的 HTML 文件内容
- 调用 useTemplateParser 按 selector 提取组件 HTML 片段
- 将片段解析为 DomNode 树（分配新 ID）
- 调用 domTreeStore.insertNodes 插入到当前文档
- 插入位置：选中节点的 children 末尾，或 body 末尾
- 标记文档为 dirty

### REQ-6: 双击模板名 → 打开编辑

- 双击模板名称时，调用 projectStore.loadFile 加载模板的 HTML 文件
- 与打开普通文件流程相同

### REQ-7: 模板状态管理

template store (Pinia) 管理：
- `templateDir`: 模板根目录路径（从 localStorage 初始化）
- `templates`: 模板配置列表（TemplateConfig[]）
- `setTemplateDir(path)`: 设置目录并重新扫描
- `loadTemplates()`: 扫描目录加载模板配置

## 验收标准

- 点击"内置模板" tab 显示模板面板
- 配置模板目录后，左侧展示模板名和组件列表
- 单击组件，当前文档 DOM 树中新增对应 HTML 片段
- 双击模板名，中间区域加载并预览该模板
- 模板资源 URL 被正确重写为 baseUrl 前缀
