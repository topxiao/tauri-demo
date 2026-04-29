## 1. 可复用组件

- [ ] 1.1 创建 StepperInput.vue — ±步进器组件（减号按钮 + 数值输入框 + 加号按钮 + 单位选择器）
- [ ] 1.2 创建 ButtonGroupSelect.vue — 互斥按钮组组件（配置驱动、选中高亮、可取消选择）
- [ ] 1.3 创建 ColorInput.vue — 颜色输入组件（预览色块 + 文本输入 + 系统颜色选择器）

## 2. StylePanel 分区实现

- [ ] 2.1 创建 StylePanel.vue 骨架 + 外边距/间距分区（StepperInput × 4）
- [ ] 2.2 实现尺寸分区（width/height/max-width/max-height StepperInput）
- [ ] 2.3 实现盒宽填充 + 横轴溢出 + 纵轴溢出分区（ButtonGroupSelect）
- [ ] 2.4 实现 Flex 布局分区（条件显示 display=flex，flex-direction/justify-content/align-items/flex-wrap ButtonGroupSelect + gap StepperInput）
- [ ] 2.5 实现字体分区（font-weight ButtonGroupSelect + font-size/line-height StepperInput + text-align ButtonGroupSelect + color ColorInput）
- [ ] 2.6 实现文字装饰分区（text-decoration ButtonGroupSelect + letter-spacing StepperInput）
- [ ] 2.7 实现背景设置分区（填充方式 ButtonGroupSelect + 条件显示 background-color ColorInput / background-image URL 输入）
- [ ] 2.8 实现边框分区（border-width StepperInput + border-style ButtonGroupSelect + border-color ColorInput + border-radius 4角 StepperInput）
- [ ] 2.9 实现效果分区（opacity 滑块 + box-shadow 输入框）
- [ ] 2.10 实现自定义属性区域（自由添加/删除 CSS 属性键值对）

## 3. 集成与清理

- [ ] 3.1 重写 StyleEditor.vue — 移除 tabs，集成 StylePanel，保留元素信息栏和空状态
- [ ] 3.2 删除 StylePropertyGroups.vue（已被 StylePanel.vue 替代）
- [ ] 3.3 添加样式 — 匹配参考设计图的视觉风格（蓝色按钮、紧凑布局、浅灰边框）
- [ ] 3.4 验证 — 启动应用，选中元素测试所有分区交互，确认 iframe 预览实时更新
