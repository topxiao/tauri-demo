## MODIFIED Requirements

### Requirement: Display selected element info
样式编辑器顶部 SHALL 显示当前选中元素的标签名和 class/id 信息。

#### Scenario: Show element identifier
- **WHEN** 用户选中 `<div class="container" id="main">`
- **THEN** 样式编辑器顶部显示 `<div class="container" id="main">`

### Requirement: Unified inline style editing panel
样式编辑器 SHALL 直接展示内联样式编辑面板，不使用 tabs 切换。面板由多个分区组成（外边距、间距、尺寸、盒宽填充、横轴溢出、纵轴溢出、Flex 布局、字体、文字装饰、背景设置、边框、效果、自定义属性），每个分区可折叠展开。所有编辑操作直接修改元素的内联 style 属性。

#### Scenario: No tabs shown
- **WHEN** 用户选中一个元素
- **THEN** 样式编辑器直接展示分区面板，无 inline/style-tag/external tabs

#### Scenario: Edit property via stepper
- **WHEN** 用户在"间距"分区通过步进器修改 padding-top 为 `20px`
- **THEN** DomNode.attributes.style 中 padding-top 更新，iframe 预览实时更新

#### Scenario: Edit property via button group
- **WHEN** 用户在"横轴溢出"分区点击"隐藏"按钮
- **THEN** overflow-x: hidden 写入内联样式

#### Scenario: No element selected
- **WHEN** 没有选中任何 DOM 元素
- **THEN** 样式编辑器显示空状态提示"请在 DOM 树中选择一个元素"

## REMOVED Requirements

### Requirement: Style source tabs
**Reason**: 重构为统一内联样式编辑面板，移除三栏 tabs 切换
**Migration**: style-tag 和 external CSS 可视化编辑可在后续迭代中通过其他 UI 形式加回

### Requirement: Display matching CSS rules
**Reason**: 移除 tabs 后不再按来源展示规则列表
**Migration**: CSS 规则匹配功能保留在底层 composable 中，后续可加回高级视图

### Requirement: Edit style tag rules
**Reason**: 面板重构仅聚焦内联样式编辑
**Migration**: style-tag 编辑功能可在后续迭代中通过独立入口加回

### Requirement: Edit external CSS file rules
**Reason**: 面板重构仅聚焦内联样式编辑
**Migration**: external CSS 编辑功能可在后续迭代中通过独立入口加回

### Requirement: Grouped style property panels
**Reason**: 替换为设计工具风格的分区面板（详见 style-panel-ui capability）
**Migration**: 新面板覆盖原有所有属性并扩展更多常用 CSS 属性
