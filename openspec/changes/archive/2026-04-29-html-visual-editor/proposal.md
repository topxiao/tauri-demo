## Why

需要一个跨平台桌面工具，让用户以可视化方式编辑 HTML 页面——通过 DOM 树操作元素、通过表单控件编辑 CSS 样式、通过 iframe 实时预览效果——而不是手写代码。降低 HTML 页面编辑的门槛，同时保留直接修改源文件的能力。

## What Changes

- 新建 Tauri v2 + Vue 3 + TypeScript 桌面应用，三栏布局：左侧文件树/DOM树、中间 iframe 实时预览、右侧样式编辑器
- 支持导入文件夹，自动识别 HTML 文件并在文件树中展示，可多文件切换编辑
- 将 HTML 文件解析为 DOM 树（parse5），以树组件形式展示，支持折叠展开、选中高亮
- DOM 树节点支持新增、删除、编辑（标签名、属性、文本内容）、拖拽排序
- 选中 DOM 节点后，iframe 中对应元素高亮显示；iframe 中点击元素反向选中 DOM 节点
- 右侧样式编辑器支持三种 CSS 来源的编辑：内联 style 属性、`<style>` 标签内规则、外部 .css 文件规则
- 样式属性按分组展示（布局、间距、排版、背景、边框、Flexbox、自定义），提供表单控件和颜色选择器
- 保存时通过 parse5 序列化 HTML、css-tree 序列化 CSS，写回原文件，保留原始格式
- 支持撤销/重做（Ctrl+Z / Ctrl+Y）
- 未保存变更的防丢失保护（切换文件/关闭窗口时提示）

## Capabilities

### New Capabilities

- `project-management`: 文件夹导入、文件树展示、多 HTML 文件切换、Rust 文件 I/O 接口
- `dom-tree-editor`: HTML 解析为 DOM 树、树组件展示、节点增删改、拖拽排序、右键菜单、属性编辑弹窗
- `live-preview`: iframe 实时预览、元素高亮、双向选中同步（DOM 树↔iframe）、postMessage 通信协议
- `css-style-editor`: 三种 CSS 来源（内联/`<style>`/外部文件）的解析编辑、样式来源 Tab 切换、选择器匹配、分组属性表单、颜色选择器
- `save-and-serialize`: HTML/CSS 序列化保存、防丢失保护、Undo/Redo

### Modified Capabilities

（新项目，无已有 capability）

## Impact

- **新建项目**：Tauri v2 + Vue 3 + TypeScript + Vite 项目骨架
- **新增依赖**：parse5、css-tree、element-plus、pinia、vue
- **Rust 后端**：新增文件 I/O 相关 Tauri commands（open_folder、read_file、write_file、list_files）
- **前端新增文件**：5 个组件、3 个 store、3 个 composable、2 个工具函数
