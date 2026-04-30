## Why

用户需要将预置的 HTML 组件片段（轮播图、背景图、登录表单等）快速插入到当前编辑的文档中，同时也能打开完整的模板文件进行可视化编辑。当前只能从文件浏览器手动打开文件，无法按组件粒度复用模板片段。

## What Changes

- 左侧面板新增"内置模板" tab（与"文件""DOM 树"并列）
- 从模板目录的 `template.json` 读取组件配置，展示组件列表
- 单击组件：提取 HTML 片段并插入到当前文档 DOM 树
- 双击模板名：打开整个模板文件进入编辑模式
- 模板根目录路径可配置（Tauri 文件对话框 + localStorage）
- 模板资源路径（src/href）按 `baseUrl` 配置自动重写为完整 URL

## Capabilities

### New Capabilities
- `template-panel`: 左侧面板内置模板 tab，展示模板组件列表，支持插入组件片段和打开模板编辑
- `template-parser`: 解析模板 HTML 并按 CSS 选择器提取组件片段，支持 URL 重写

### Modified Capabilities

## Impact

- 新增文件：`TemplatePanel.vue`, `stores/template.ts`, `composables/useTemplateParser.ts`
- 修改文件：`LeftPanel.vue`（新增 tab）, `stores/domTree.ts`（新增 insertNodes 方法）
- 新增 Tauri 命令依赖：`read_dir`（读取模板子目录列表）
- 无外部依赖变更
