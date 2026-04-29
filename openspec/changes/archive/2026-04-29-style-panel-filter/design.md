## Context

当前 StylePanel.vue 包含 13 个属性分组（margin、padding、size、boxFill、overflowX、overflowY、flex、font、textDecor、background、border、effect、custom），对所有元素类型一视同仁。用户选中 `<span>` 或 `<img>` 时仍看到不相关的分组如 flex 布局、文字装饰。

## Goals / Non-Goals

**Goals:**
- 根据元素标签类型动态过滤可见分组，减少信息噪声
- 维护简单：标签分类映射可读、易扩展

**Non-Goals:**
- 不基于计算样式（computed style）动态判断，仅按标签分类
- 不支持用户自定义分组可见性配置

## Decisions

### 1. 标签分类方案

使用两层映射：`tag → category → sections[]`。共 8 个分类：

| 分类 | 标签示例 | 可见分组 |
|------|---------|---------|
| block | div, section, article, aside, main, header, footer, nav, figure, figcaption, details, summary, dialog, form, fieldset | 全部 |
| textInline | span, a, em, strong, b, i, u, s, mark, small, sub, sup, abbr, cite, q, time, del, ins, address, label, legend, code | margin, padding, font, textDecor, background, border, effect, custom |
| heading | h1-h6, p, blockquote, pre | margin, padding, size, font, textDecor, background, border, effect, custom |
| media | img, video, audio, canvas, svg, embed, object, picture, source, map, area | margin, padding, size, background, border, effect, custom |
| iframe | iframe | margin, padding, size, overflowX, overflowY, background, border, effect, custom |
| listItem | ul, ol, li, dl, dt, dd | margin, padding, size, font, textDecor, background, border, effect, custom |
| tablePart | table, thead, tbody, tfoot, tr, td, th, caption, colgroup, col | margin, padding, size, background, border, effect, custom |
| formElement | input, button, select, option, optgroup, textarea, datalist, output, progress, meter | margin, padding, size, font, textDecor, background, border, effect, custom |

未在映射中的标签默认显示全部分组。

### 2. 实现位置

在 StylePanel.vue 内部新增：
- `TAG_CATEGORIES` 常量映射 tag → category
- `CATEGORY_SECTIONS` 常量映射 category → 可见分组数组
- `visibleSections` computed：根据 `props.element.tagName` 查表
- 模板中每个 section 包裹 `<template v-if="visibleSections.has('xxx')">`

### 3. Flex 分组特殊处理

Flex 分组只在 block 分类中可见（因为只有块级容器才有意义设置为 flex 容器）。如果用户对 inline 元素设置 `display: flex`，可通过"自定义属性"手动添加。

## Risks / Trade-offs

- 静态分类无法覆盖动态样式场景（如通过 CSS 将 span 设为 `display: block`），但这是刻意简化，避免引入计算样式依赖
- 新增标签时需手动更新映射，但影响面小且低频
