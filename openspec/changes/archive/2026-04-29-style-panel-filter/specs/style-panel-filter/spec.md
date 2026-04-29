# style-panel-filter

## 需求

### REQ-1: 标签分类映射

StylePanel 维护一个 `TAG_CATEGORIES` 映射表，将 HTML 标签名映射到 8 个分类之一：block、textInline、heading、media、iframe、listItem、tablePart、formElement。

标签分类规则：
- **block**: div, section, article, aside, main, header, footer, nav, figure, figcaption, details, summary, dialog, form, fieldset
- **textInline**: span, a, em, strong, b, i, u, s, mark, small, sub, sup, abbr, cite, q, time, del, ins, address, label, legend, code
- **heading**: h1, h2, h3, h4, h5, h6, p, blockquote, pre
- **media**: img, video, audio, canvas, svg, embed, object, picture, source, map, area
- **iframe**: iframe
- **listItem**: ul, ol, li, dl, dt, dd
- **tablePart**: table, thead, tbody, tfoot, tr, td, th, caption, colgroup, col
- **formElement**: input, button, select, option, optgroup, textarea, datalist, output, progress, meter

### REQ-2: 分类可见分组映射

`CATEGORY_SECTIONS` 映射每个分类到其可见分组数组：

- block: 全部分组（margin, padding, size, boxFill, overflowX, overflowY, flex, font, textDecor, background, border, effect, custom）
- textInline: margin, padding, font, textDecor, background, border, effect, custom
- heading: margin, padding, size, font, textDecor, background, border, effect, custom
- media: margin, padding, size, background, border, effect, custom
- iframe: margin, padding, size, overflowX, overflowY, background, border, effect, custom
- listItem: margin, padding, size, font, textDecor, background, border, effect, custom
- tablePart: margin, padding, size, background, border, effect, custom
- formElement: margin, padding, size, font, textDecor, background, border, effect, custom

### REQ-3: 动态过滤渲染

- StylePanel 新增 `visibleSections` computed，根据 `props.element.tagName` 查询 TAG_CATEGORIES → CATEGORY_SECTIONS 得到可见分组的 Set
- 未在映射中的标签默认显示全部分组
- 模板中每个 section 使用 `v-if="visibleSections.has('<sectionKey>')"` 条件渲染

### REQ-4: 节点切换时重建

当 `props.element.id` 变化时（watch 已有），`visibleSections` 自动重新计算，无需额外处理。

## 验收标准

- 选中 `<span>` 时，右侧面板不显示 size、boxFill、overflowX、overflowY、flex 分组
- 选中 `<img>` 时，不显示 font、textDecor、flex、boxFill、overflowX、overflowY 分组
- 选中 `<div>` 时，显示全部分组
- 选中未知标签（如 `<my-custom>`）时，显示全部分组
