## ADDED Requirements

### Requirement: Display selected element info
样式编辑器顶部 SHALL 显示当前选中元素的标签名和 class/id 信息。

#### Scenario: Show element identifier
- **WHEN** 用户选中 `<div class="container" id="main">`
- **THEN** 样式编辑器顶部显示 `<div class="container" id="main">`

### Requirement: Style source tabs
样式编辑器 SHALL 提供三个标签页切换 CSS 编辑来源：内联样式、`<style>` 标签、外部 CSS 文件。每个 Tab 显示数字徽章表示该来源匹配的规则数量。

#### Scenario: Show matching rule counts
- **WHEN** 选中元素 `.container` 在外部 CSS 中匹配 2 条规则、在 `<style>` 中匹配 1 条规则、无内联样式
- **THEN** Tab 徽章分别为：内联样式(0)、`<style>`(1)、外部 CSS(2)

#### Scenario: Switch between source tabs
- **WHEN** 用户点击"外部 CSS"Tab
- **THEN** 样式编辑器展示外部 CSS 文件中匹配该元素的所有规则列表

### Requirement: Display matching CSS rules
每个样式来源 Tab 下 SHALL 展示该来源中匹配当前选中元素的所有 CSS 规则。每条规则显示选择器名、文件位置（如 `style.css:12`）、属性列表。

#### Scenario: Show rules from external CSS
- **WHEN** 外部 CSS 文件 `style.css` 中有 `.container { width: 960px; margin: 0 auto; }`
- **THEN** 样式编辑器展示该规则，选择器显示 `.container`，位置显示 `style.css:12`，属性列表显示 width 和 margin

#### Scenario: Show overridden properties
- **WHEN** 同一属性在多个来源中定义（如内联 `width: 100%` 覆盖外部 CSS 的 `width: 960px`）
- **THEN** 被覆盖的值显示删除线样式

### Requirement: Edit inline styles
系统 SHALL 支持编辑元素的 `style` 属性中的 CSS 属性。内联样式作为键值对对象存储在 DomNode.attributes.style 中。

#### Scenario: Modify inline style property
- **WHEN** 用户在"内联样式"Tab 中修改 padding 值从 `10px` 为 `20px`
- **THEN** DomNode.attributes.style 中对应值更新，iframe 预览实时更新

#### Scenario: Add inline style property
- **WHEN** 用户在"内联样式"Tab 中新增 `color: red`
- **THEN** 新属性追加到 style 属性字符串末尾，iframe 预览实时更新

### Requirement: Edit style tag rules
系统 SHALL 支持编辑 HTML 文件内 `<style>` 标签中的 CSS 规则。使用 css-tree 解析为 AST，编辑操作修改 AST 节点。

#### Scenario: Modify a property in style tag rule
- **WHEN** 用户在 `<style>` Tab 中修改 `.container` 的 `width` 值
- **THEN** css-tree AST 中对应 Declaration 节点更新，iframe 预览实时更新

### Requirement: Edit external CSS file rules
系统 SHALL 支持编辑外部 .css 文件中的 CSS 规则。使用 Rust `read_file` 读取文件，css-tree 解析为 AST，编辑后通过 `write_file` 保存。

#### Scenario: Modify a property in external CSS
- **WHEN** 用户在"外部 CSS"Tab 中修改 `style.css` 里 `.container` 的 `width` 值
- **THEN** css-tree AST 中对应 Declaration 节点更新，iframe 预览实时更新。保存时通过 Rust `write_file` 写回 `style.css`

### Requirement: Grouped style property panels
样式属性 SHALL 按以下分组以可折叠面板展示：布局（display、position、width、height）、Flexbox（flex-direction、justify-content、align-items，仅 display:flex 时显示）、间距（margin、padding，含可视化盒模型图）、排版（font-family、font-size、font-weight、line-height、text-align、color）、背景（background-color，含颜色选择器）、边框（border-width、border-style、border-color、border-radius）、自定义属性（自由添加任意 CSS 属性键值对）。

#### Scenario: Show layout properties
- **WHEN** 用户展开"布局"分组
- **THEN** 显示 display（下拉）、position（下拉）、width（输入框）、height（输入框）四个属性控件，当前值已填入

#### Scenario: Conditional Flexbox panel
- **WHEN** 选中元素的 display 属性为 flex
- **THEN** Flexbox 分组显示；当 display 不是 flex 时，Flexbox 分组隐藏

#### Scenario: Color picker for background
- **WHEN** 用户展开"背景"分组并点击颜色值
- **THEN** 弹出 Element Plus 颜色选择器，用户选色后背景色实时更新

### Requirement: Simple selector matching
系统 SHALL 根据选中元素的 tagName、class 列表、id 对 CSS AST 中的选择器做精确匹配。支持 `.className`、`#id`、`tagName` 三种简单选择器格式。

#### Scenario: Match class selector
- **WHEN** 选中元素有 `class="container"`，CSS 中有 `.container { ... }` 规则
- **THEN** 该规则在样式编辑器中展示

#### Scenario: Match tag selector
- **WHEN** 选中元素是 `<div>`，CSS 中有 `div { box-sizing: border-box }` 规则
- **THEN** 该规则在样式编辑器中展示

#### Scenario: No matching rules
- **WHEN** 选中元素不匹配任何 CSS 规则
- **THEN** 样式编辑器显示"该元素暂无匹配的 CSS 规则"
