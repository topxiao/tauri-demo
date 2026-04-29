## 1. 项目骨架搭建

- [x] 1.1 使用 `npm create tauri-app@latest` 初始化 Tauri v2 + Vue 3 + TypeScript 项目
- [x] 1.2 安装前端依赖：element-plus、parse5、css-tree、pinia
- [x] 1.3 配置 Vite 和 TypeScript 基础设置
- [x] 1.4 创建 App.vue 三栏布局骨架（左侧面板 | 中间预览 | 右侧面板），使用 flexbox 实现

## 2. Rust 文件 I/O Commands

- [x] 2.1 实现 `open_folder` command — 弹出系统文件选择对话框，返回文件夹路径
- [x] 2.2 实现 `list_files` command — 递归列出文件夹下文件树结构（返回 JSON）
- [x] 2.3 实现 `read_file` command — 读取指定路径文件内容返回字符串
- [x] 2.4 实现 `write_file` command — 将内容字符串写入指定路径文件

## 3. 文件树和项目管理

- [x] 3.1 创建 Pinia project store — 管理当前打开的文件夹路径、文件列表、当前编辑文件
- [x] 3.2 实现 FileExplorer.vue — 使用 el-tree 展示文件夹结构，HTML 文件可点击，其他文件灰色
- [x] 3.3 实现文件夹导入流程 — 点击"打开文件夹" → Rust open_folder → list_files → 渲染文件树
- [x] 3.4 实现 HTML 文件切换 — 点击文件树中的 HTML 文件 → read_file → 更新当前编辑状态
- [x] 3.5 实现切换文件时的未保存变更检测和确认弹窗

## 4. HTML 解析和 DOM 树

- [x] 4.1 实现 useHtmlParser composable — 使用 parse5 将 HTML 字符串解析为 DomNode 树结构
- [x] 4.2 实现 DomNode 数据结构 — id 生成、type/tagName/attributes/textContent/children 映射
- [x] 4.3 创建 Pinia domTree store — 管理 DomNode 树、选中节点、展开状态
- [x] 4.4 实现 DomTree.vue — 使用 el-tree 渲染 DomNode 树，支持折叠展开、选中高亮
- [x] 4.5 实现 DOM 树节点右键上下文菜单（添加子节点、编辑属性、复制、删除）
- [x] 4.6 实现 DomNodeEditor.vue 弹窗 — 标签类型下拉选择 + 自定义输入、属性键值对动态增删
- [x] 4.7 实现 DOM 节点新增功能 — 工具栏"添加节点"和右键"添加子节点"
- [x] 4.8 实现 DOM 节点删除功能 — 删除选中节点及其子节点
- [x] 4.9 实现双击文本节点编辑功能 — inline 编辑模式
- [x] 4.10 实现 DOM 节点拖拽排序 — el-tree 拖拽配置，限制同级拖拽

## 5. iframe 实时预览

- [x] 5.1 实现 PreviewPane.vue — iframe 容器，通过 srcdoc 注入 HTML 内容
- [x] 5.2 编写 iframe helper 脚本 — 注入到 HTML 中，监听 click 事件、响应 postMessage
- [x] 5.3 实现 useIframeSync composable — postMessage 双向通信协议
- [x] 5.4 实现 DOM 树选中 → iframe 元素高亮 — 发送 highlight/unhighlight 消息
- [x] 5.5 实现 iframe 点击元素 → DOM 树选中 — 接收 elementClicked 消息
- [x] 5.6 实现 HTML 变更后 iframe srcdoc 更新（增量同步或全量重载）
- [x] 5.7 实现预览区顶部状态栏 — 显示当前文件名和选中元素信息

## 6. CSS 解析和样式编辑器

- [x] 6.1 实现 useCssEditor composable — 使用 css-tree 解析三种来源的 CSS 为 AST
- [x] 6.2 实现内联样式解析 — 将 DomNode.attributes.style 字符串拆分为键值对对象
- [x] 6.3 实现 `<style>` 标签 CSS 解析 — 从 parse5 AST 中提取 `<style>` 内容，css-tree 解析
- [x] 6.4 实现外部 CSS 文件解析 — Rust read_file 读取 .css 文件，css-tree 解析，记录文件路径
- [x] 6.5 创建 Pinia styleState store — 管理三种来源的 CSS AST、当前编辑来源、匹配规则
- [x] 6.6 实现简单选择器匹配 — 根据 tagName/class/id 精确匹配 CSS AST 中的选择器
- [x] 6.7 实现 StyleEditor.vue 基础结构 — 选中元素信息、样式来源 Tab（内联/style/外部CSS）、徽章数字
- [x] 6.8 实现 Tab 下匹配规则列表展示 — 选择器名、文件位置、属性列表
- [x] 6.9 实现内联样式编辑 — 属性值修改/新增，同步更新 DomNode 和 iframe
- [x] 6.10 实现 `<style>` 标签规则编辑 — 修改 css-tree AST Declaration，同步 iframe
- [x] 6.11 实现外部 CSS 文件规则编辑 — 修改 css-tree AST，标记为脏文件待保存
- [x] 6.12 实现分组样式面板 — 布局、间距、排版、背景、边框、自定义属性（可折叠）
- [x] 6.13 实现 Flexbox 条件面板 — 仅 display:flex 时显示
- [x] 6.14 实现间距分组可视化盒模型图
- [x] 6.15 实现背景颜色选择器 — Element Plus el-color-picker 集成

## 7. 序列化和保存

- [x] 7.1 实现 htmlSerializer — parse5 AST 序列化为 HTML 字符串（保留格式）
- [x] 7.2 实现 cssSerializer — css-tree AST 序列化为 CSS 字符串（保留格式）
- [x] 7.3 实现完整保存流程 — DOM 变更同步 parse5 AST → CSS 变更同步 css-tree AST → 内联 style 写入属性 → parse5 序列化 HTML → Rust write_file HTML + 外部 CSS
- [x] 7.4 实现 Ctrl+S 快捷键绑定
- [x] 7.5 实现保存状态标记 — 已保存/未保存状态切换，窗口标题提示
- [x] 7.6 实现错误处理 — 保存失败 Toast 提示，内存中变更不丢失

## 8. Undo/Redo

- [x] 8.1 实现 Pinia 快照插件 — 每次 DOM/CSS 变更前记录完整状态快照
- [x] 8.2 实现撤销功能 — Ctrl+Z 触发，恢复上一个快照状态
- [x] 8.3 实现重做功能 — Ctrl+Y 触发，重做撤销的操作
- [x] 8.4 实现快照栈深度限制 — 默认 50 步，超出丢弃最早快照

## 9. 集成和收尾

- [x] 9.1 左侧面板标签页切换（文件树 / DOM 树）实现
- [x] 9.2 关闭窗口时未保存变更拦截
- [x] 9.3 CSS 被覆盖属性值删除线样式展示
- [x] 9.4 端到端测试：导入文件夹 → 编辑 DOM → 编辑样式 → 保存 → 验证原文件
