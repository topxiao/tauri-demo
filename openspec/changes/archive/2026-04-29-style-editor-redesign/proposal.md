## Why

当前样式编辑器使用 Element Plus 标准组件（el-collapse + el-select + el-input），交互体验偏"开发者工具"风格。需要重写为设计工具风格的自定义 UI，使用按钮组互斥选择、±步进器、内嵌颜色预览等控件，并补充更多常用 CSS 属性（margin、尺寸、Flex 布局、文字装饰、效果等），提升可视化编辑效率。

## What Changes

- 重写 StylePropertyGroups.vue 为全新 StylePanel.vue，采用设计工具风格分区面板
- 新增 StepperInput.vue 可复用步进器组件（±按钮 + 数值输入 + 单位选择器）
- 新增 ButtonGroupSelect.vue 可复用互斥按钮组组件
- 调整 StyleEditor.vue，移除 inline/style-tag/external 三栏 tabs，统一为内联样式编辑面板
- 补充 CSS 属性覆盖：外边距、尺寸、Flex 布局、文字装饰、透明度、阴影等
- 保留自定义属性区域，供高级用户直接编辑任意 CSS 属性

## Capabilities

### New Capabilities

- `style-panel-ui`: 设计工具风格样式面板组件（StepperInput、ButtonGroupSelect、StylePanel 分区布局）

### Modified Capabilities

- `css-style-editor`: 移除三栏 tabs 切换，统一为内联样式编辑面板；扩展属性覆盖范围（新增 margin、尺寸、Flex、文字装饰、效果等）

## Impact

- 前端文件：StyleEditor.vue（简化）、StylePropertyGroups.vue（替换为 StylePanel.vue）、新增 2 个可复用组件
- 不涉及 Rust 后端（src-tauri/）
- 不涉及左侧面板（LeftPanel/FileExplorer/DomTree）和中间预览面板（PreviewPane）
- 不影响 stores 和 composables 层（数据流不变）
