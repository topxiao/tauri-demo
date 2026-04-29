## ADDED Requirements

### Requirement: StepperInput component
系统 SHALL 提供 `StepperInput.vue` 可复用组件，包含 "−" 按钮、数值输入框、"+" 按钮，可选单位选择器。步进默认值为 1，支持自定义步进值。输入框支持直接输入数值。单位选择器 SHALL 提供常用 CSS 单位选项（px、em、rem、%、vh、vw）。

#### Scenario: Increment value
- **WHEN** 用户点击 "+" 按钮，当前值为 `10`，步进为 `1`
- **THEN** 输入框值变为 `11`

#### Scenario: Decrement value
- **WHEN** 用户点击 "−" 按钮，当前值为 `10`，步进为 `1`
- **THEN** 输入框值变为 `9`

#### Scenario: Direct input
- **WHEN** 用户直接在输入框输入 `25.5`
- **THEN** 组件发出更新事件，值为 `25.5`

#### Scenario: Unit selector
- **WHEN** 用户从单位选择器选择 `em`
- **THEN** 组件发出更新事件，值附带单位后缀（如 `10em`）

#### Scenario: Empty value
- **WHEN** 用户清空输入框
- **THEN** 组件发出更新事件，值为空字符串

### Requirement: ButtonGroupSelect component
系统 SHALL 提供 `ButtonGroupSelect.vue` 可复用组件，渲染一组互斥按钮。选中按钮 SHALL 有视觉高亮（蓝色实心背景）。支持单选模式。按钮文字从配置数组中读取。

#### Scenario: Select an option
- **WHEN** 按钮组配置为 `[{label:'无', value:''}, {label:'自动', value:'auto'}]`，用户点击"自动"
- **THEN** "自动"按钮高亮，组件发出更新事件值为 `auto`

#### Scenario: Click selected button to deselect
- **WHEN** 用户点击已选中的按钮
- **THEN** 按钮取消高亮，组件发出更新事件值为空字符串

### Requirement: StylePanel layout sections
`StylePanel.vue` SHALL 按以下分区组织样式属性编辑，每个分区有标题栏，可折叠/展开：

1. **外边距**：margin-top / margin-right / margin-bottom / margin-left，每项使用 StepperInput
2. **间距（内边距）**：padding-top / padding-right / padding-bottom / padding-left，每项使用 StepperInput
3. **尺寸**：width、height、max-width、max-height，每项使用 StepperInput
4. **盒宽填充**：ButtonGroupSelect，选项为 无('')/自动('auto')/1等分('flex:1')/2等分('flex:2')
5. **横轴溢出**：ButtonGroupSelect，选项为 默认('visible')/自动('auto')/隐藏('hidden')/滚动('scroll')
6. **纵轴溢出**：ButtonGroupSelect，选项为 默认('visible')/自动('auto')/隐藏('hidden')/滚动('scroll')
7. **Flex 布局**（仅 display=flex 时显示）：flex-direction（row/row-reverse/column/column-reverse）、justify-content（flex-start/flex-end/center/space-between/space-around）、align-items（flex-start/flex-end/center/stretch）、flex-wrap（nowrap/wrap）、gap 使用 StepperInput
8. **字体**：font-weight（细 300/正常 400/粗 700）ButtonGroupSelect、font-size StepperInput、line-height StepperInput、text-align（左/中/右/两端）ButtonGroupSelect、color 颜色输入
9. **文字装饰**：text-decoration（无/下划线/删除线）ButtonGroupSelect、letter-spacing StepperInput
10. **背景设置**：填充方式 ButtonGroupSelect（无/颜色/图片），选"颜色"显示 background-color 颜色输入，选"图片"显示 background-image URL 输入
11. **边框**：border-width StepperInput、border-style ButtonGroupSelect（none/solid/dashed/dotted）、border-color 颜色输入、border-radius 4角 StepperInput（左上/右上/右下/左下）
12. **效果**：opacity 滑块（0-100）、box-shadow 输入框
13. **自定义属性**：自由添加/删除任意 CSS 属性键值对

#### Scenario: Spacing section with stepper
- **WHEN** 用户在"间距"分区点击 padding-top 的 "+" 按钮
- **THEN** padding-top 值增加 1 个单位，style 属性实时更新

#### Scenario: Box fill button group
- **WHEN** 用户在"盒宽填充"分区点击"1等分"
- **THEN** 组件设置 `flex: 1` 到内联样式

#### Scenario: Conditional Flex section
- **WHEN** 选中元素的 display 不为 flex
- **THEN** Flex 布局分区隐藏

#### Scenario: Background color mode
- **WHEN** 用户在"背景设置"分区选择"颜色"填充方式
- **THEN** 显示 background-color 颜色选择器

#### Scenario: Background image mode
- **WHEN** 用户在"背景设置"分区选择"图片"填充方式
- **THEN** 显示 background-image URL 输入框

#### Scenario: Border radius per corner
- **WHEN** 用户在"边框"分区设置左上圆角为 `8px`
- **THEN** border-radius 内联样式更新（如 `8px 0 0 0`）

### Requirement: Color input component
每个颜色属性 SHALL 提供一个内嵌颜色预览块 + 文本输入框。预览块显示当前颜色值对应的色块。用户可直接输入颜色值（hex、rgb、颜色名），或点击预览块打开系统颜色选择器。

#### Scenario: Pick color via preview block
- **WHEN** 用户点击字体颜色预览块
- **THEN** 弹出颜色选择器，选色后实时更新

#### Scenario: Type hex color
- **WHEN** 用户在颜色输入框输入 `#ff6600`
- **THEN** 预览块更新为橙色，style 属性更新

### Requirement: Unit-aware value editing
步进器控件 SHALL 支持带单位的 CSS 值。当解析已有值时，自动分离数值和单位。编辑时保持原单位不变，用户可通过单位选择器切换。

#### Scenario: Parse existing value with unit
- **WHEN** 已有 padding 值为 `1.5em`，加载到 StepperInput
- **THEN** 数值显示 `1.5`，单位选择器选中 `em`

#### Scenario: Change unit
- **WHEN** 用户将 `16px` 的单位从 `px` 切换为 `rem`
- **THEN** 值更新为 `16rem`（单位切换不自动换算数值）
