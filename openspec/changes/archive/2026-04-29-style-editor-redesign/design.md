## Context

当前右侧面板 `StyleEditor.vue` + `StylePropertyGroups.vue` 使用 Element Plus 标准组件（el-collapse + el-select + el-input + el-color-picker），提供 inline/style-tag/external 三栏 tabs 切换。交互风格偏"开发者工具"，对非技术用户不友好。

用户提供的参考设计图展示了设计工具风格的面板：按钮组互斥选择、±步进器控件、分区面板布局。需要将现有实现重写为该风格，并补充更多常用 CSS 属性。

## Goals / Non-Goals

**Goals:**
- 重写为设计工具风格 UI，匹配参考设计图
- 使用自定义组件（StepperInput、ButtonGroupSelect）替代 Element Plus 默认表单控件
- 补充 CSS 属性覆盖：margin、尺寸、Flex 布局、文字装饰、效果（opacity、box-shadow）
- 保持现有数据流不变（stores + composables 层不修改）

**Non-Goals:**
- 不修改 Rust 后端
- 不修改左侧面板和中间预览面板
- 不修改 stores 和 composables 的核心逻辑
- 不实现 style-tag / external CSS 的可视化编辑（移除三栏 tabs，仅编辑内联样式）
- 不实现响应式设计（仅桌面端）

## Decisions

### 1. 移除三栏 tabs，统一为内联样式编辑面板

**选择：** 移除 inline/style-tag/external tabs，所有可视化编辑直接操作元素 inline style。

**替代方案：** 保留 tabs + 在 inline tab 内嵌入新 UI。但参考设计图无 tabs，且 inline 样式是最直接的编辑方式。

**理由：** 参考设计图无 tabs，统一面板更简洁。style-tag 和 external CSS 的高级编辑可作为后续迭代。

### 2. 自定义可复用组件替代 Element Plus 表单控件

**选择：** 新建 `StepperInput.vue`（±按钮 + 数值输入 + 单位选择器）和 `ButtonGroupSelect.vue`（互斥按钮组）。

**理由：** Element Plus 没有提供匹配参考设计图的步进器和紧凑按钮组。自定义组件可精确匹配设计风格。

### 3. 分区面板使用自定义折叠而非 el-collapse

**选择：** 手动实现折叠面板（标题 + v-show 切换内容），不使用 el-collapse。

**理由：** el-collapse 样式难以精确匹配参考设计图的紧凑布局。自定义实现更灵活。

### 4. CSS 属性值存储格式

**选择：** 保持现有格式——inline style 字符串存储在 `DomNode.attributes.style` 中，通过 `parseInlineStyles` / `serializeInlineStyles` 解析和序列化。

**理由：** 数据流不变，仅 UI 层重写，风险最小。

## Risks / Trade-offs

- **[移除 style-tag/external 编辑]** → 用户失去对 `<style>` 标签和外部 CSS 文件的可视化编辑能力。后续迭代可加回。
- **[自定义组件开发量]** → StepperInput 和 ButtonGroupSelect 需要手写样式和交互逻辑，但组件简单且可复用。
- **[属性覆盖不完整]** → 初版只覆盖最常见的 CSS 属性，高级属性通过"自定义属性"区域兜底。
