## Why

右侧样式面板对所有 DOM 元素展示完全相同的 13 个属性分组，导致用户在选中 `<img>` 时仍看到"字体""文字装饰"等不相关的配置项，信息噪声大，编辑效率低。

## What Changes

- 根据选中 DOM 元素的标签类型，动态过滤右侧样式面板显示的属性分组
- 定义标签分类（block、text-inline、media、heading、list、table、form、void）及其可见分组映射
- 未知标签默认显示全部分组，保证向前兼容

## Capabilities

### New Capabilities
- `style-panel-filter`: 根据元素标签类型过滤样式面板可见属性分组

### Modified Capabilities

## Impact

- 修改 `src/components/StylePanel.vue`：新增标签分类映射 + computed 计算可见分组 + 模板条件渲染
- 无 API / 依赖变更
