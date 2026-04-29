## ADDED Requirements

### Requirement: Parse HTML to DOM tree
系统 SHALL 使用 parse5 将 HTML 文件内容解析为 DomNode 树结构。每个 DomNode 包含 id、type（element/text/comment）、tagName、attributes、textContent、children。前端为每个节点生成唯一 id。

#### Scenario: Parse a well-formed HTML file
- **WHEN** 用户打开一个格式良好的 HTML 文件
- **THEN** 系统将其解析为 DomNode 树，所有元素节点、文本节点、注释节点均被保留

#### Scenario: Parse a malformed HTML file
- **WHEN** 用户打开一个格式不规范的 HTML 文件
- **THEN** parse5 以宽松模式解析，系统提示用户"该文件格式可能有问题"，仍然尝试展示 DOM 树

### Requirement: Display DOM tree in tree component
系统 SHALL 在左侧面板的"DOM 树"标签页中，使用 Element Plus el-tree 组件展示 DomNode 树。节点按 HTML 层级缩进，可折叠展开。

#### Scenario: Render DOM tree with nested elements
- **WHEN** HTML 文件包含多层嵌套的元素
- **THEN** DOM 树按层级展示，用户可点击展开/折叠按钮控制显示层级

#### Scenario: Select a DOM tree node
- **WHEN** 用户点击 DOM 树中的某个节点
- **THEN** 该节点高亮显示，中间 iframe 预览区对应元素显示蓝色边框高亮，右侧样式编辑器加载该元素的样式

### Requirement: Add DOM node
系统 SHALL 支持通过工具栏"添加节点"按钮或右键菜单"添加子节点"添加新 DOM 节点。弹出 DomNodeEditor 弹窗，用户选择标签类型（下拉 + 自定义输入）、编辑属性键值对。

#### Scenario: Add a child node to selected element
- **WHEN** 用户选中一个元素节点并点击"添加子节点"
- **THEN** 弹出节点编辑弹窗，用户填写标签名和属性后确认，新节点作为子节点插入 DOM 树

#### Scenario: Add a sibling node
- **WHEN** 用户通过工具栏"添加节点"按钮操作
- **THEN** 新节点作为选中节点的同级下一个节点插入 DOM 树

### Requirement: Delete DOM node
系统 SHALL 支持删除选中的 DOM 节点及其所有子节点。

#### Scenario: Delete a node with children
- **WHEN** 用户选中一个包含子节点的元素并执行删除
- **THEN** 该节点及其所有子节点从 DOM 树中移除，iframe 预览实时更新

### Requirement: Edit DOM node attributes
系统 SHALL 支持通过 DomNodeEditor 弹窗编辑元素节点的属性（class、id、src、href 等）。属性键值对可动态增删。

#### Scenario: Edit class attribute
- **WHEN** 用户右键节点选择"编辑属性"，修改 class 属性值后确认
- **THEN** DOM 树和 iframe 预览中该元素的 class 更新

### Requirement: Edit text content
系统 SHALL 支持双击文本节点直接编辑其文本内容。

#### Scenario: Double-click to edit text
- **WHEN** 用户双击 DOM 树中的一个文本节点
- **THEN** 该节点进入编辑模式（inline input），用户修改文本后按回车确认，DOM 树和 iframe 预览更新

### Requirement: Drag and drop reordering
系统 SHALL 支持拖拽 DOM 树节点改变其在同级中的顺序。拖拽时仅允许同级节点间调整顺序，不允许跨层级移动。

#### Scenario: Reorder sibling nodes
- **WHEN** 用户拖拽一个节点到其同级兄弟节点的上方或下方
- **THEN** 节点位置调整，DOM 树和 iframe 预览更新

#### Scenario: Attempt cross-level drag
- **WHEN** 用户试图将节点拖拽到不同层级的节点上
- **THEN** 拖拽操作被拒绝，节点保持原位

### Requirement: Context menu on DOM nodes
系统 SHALL 在 DOM 树节点上提供右键上下文菜单，包含：添加子节点、编辑属性、复制节点、删除节点。

#### Scenario: Right-click to show context menu
- **WHEN** 用户在 DOM 树节点上右键点击
- **THEN** 显示上下文菜单，包含"添加子节点"、"编辑属性"、"复制"、"删除"选项
