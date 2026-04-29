# Style Panel Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 根据选中 DOM 元素的标签类型，动态过滤右侧样式面板的可见属性分组

**Architecture:** 在 StylePanel.vue 内新增标签分类映射表 + computed 计算可见分组，模板用 v-if 条件渲染

**Tech Stack:** Vue 3 Composition API, TypeScript

---

### Task 1: 添加标签分类映射和动态分组过滤

**Files:**
- Modify: `src/components/StylePanel.vue`

- [ ] **Step 1: 在 `<script setup>` 顶部添加标签分类映射常量**

在 `import` 语句后、`const props = defineProps` 之前插入：

```typescript
const ALL_SECTIONS = ['margin', 'padding', 'size', 'boxFill', 'overflowX', 'overflowY', 'flex', 'font', 'textDecor', 'background', 'border', 'effect', 'custom'] as const

const CATEGORY_SECTIONS: Record<string, string[]> = {
  block: [...ALL_SECTIONS],
  textInline: ['margin', 'padding', 'font', 'textDecor', 'background', 'border', 'effect', 'custom'],
  heading: ['margin', 'padding', 'size', 'font', 'textDecor', 'background', 'border', 'effect', 'custom'],
  media: ['margin', 'padding', 'size', 'background', 'border', 'effect', 'custom'],
  iframe: ['margin', 'padding', 'size', 'overflowX', 'overflowY', 'background', 'border', 'effect', 'custom'],
  listItem: ['margin', 'padding', 'size', 'font', 'textDecor', 'background', 'border', 'effect', 'custom'],
  tablePart: ['margin', 'padding', 'size', 'background', 'border', 'effect', 'custom'],
  formElement: ['margin', 'padding', 'size', 'font', 'textDecor', 'background', 'border', 'effect', 'custom'],
}

const TAG_CATEGORIES: Record<string, string> = {
  'div': 'block', 'section': 'block', 'article': 'block', 'aside': 'block',
  'main': 'block', 'header': 'block', 'footer': 'block', 'nav': 'block',
  'figure': 'block', 'figcaption': 'block', 'details': 'block', 'summary': 'block',
  'dialog': 'block', 'form': 'block', 'fieldset': 'block',
  'span': 'textInline', 'a': 'textInline', 'em': 'textInline', 'strong': 'textInline',
  'b': 'textInline', 'i': 'textInline', 'u': 'textInline', 's': 'textInline',
  'mark': 'textInline', 'small': 'textInline', 'sub': 'textInline', 'sup': 'textInline',
  'abbr': 'textInline', 'cite': 'textInline', 'q': 'textInline', 'time': 'textInline',
  'del': 'textInline', 'ins': 'textInline', 'address': 'textInline',
  'label': 'textInline', 'legend': 'textInline', 'code': 'textInline',
  'h1': 'heading', 'h2': 'heading', 'h3': 'heading', 'h4': 'heading',
  'h5': 'heading', 'h6': 'heading', 'p': 'heading', 'blockquote': 'heading', 'pre': 'heading',
  'img': 'media', 'video': 'media', 'audio': 'media', 'canvas': 'media',
  'svg': 'media', 'embed': 'media', 'object': 'media', 'picture': 'media',
  'source': 'media', 'map': 'media', 'area': 'media',
  'iframe': 'iframe',
  'ul': 'listItem', 'ol': 'listItem', 'li': 'listItem',
  'dl': 'listItem', 'dt': 'listItem', 'dd': 'listItem',
  'table': 'tablePart', 'thead': 'tablePart', 'tbody': 'tablePart',
  'tfoot': 'tablePart', 'tr': 'tablePart', 'td': 'tablePart', 'th': 'tablePart',
  'caption': 'tablePart', 'colgroup': 'tablePart', 'col': 'tablePart',
  'input': 'formElement', 'button': 'formElement', 'select': 'formElement',
  'option': 'formElement', 'optgroup': 'formElement', 'textarea': 'formElement',
  'datalist': 'formElement', 'output': 'formElement', 'progress': 'formElement', 'meter': 'formElement',
}
```

- [ ] **Step 2: 添加 visibleSections computed**

在 `isFlex` computed 之后添加：

```typescript
const visibleSections = computed(() => {
  const tag = (props.element.tagName || '').toLowerCase()
  const category = TAG_CATEGORIES[tag]
  const sections = category ? CATEGORY_SECTIONS[category] : [...ALL_SECTIONS]
  return new Set(sections)
})
```

- [ ] **Step 3: 模板中为每个 section 添加 v-if 条件**

将每个 `<section class="panel-section">` 改为包含 v-if。每个 section 的 key 对应 collapsed 中的 key：

- margin → `v-if="visibleSections.has('margin')"`
- padding → `v-if="visibleSections.has('padding')"`
- size → `v-if="visibleSections.has('size')"`
- boxFill → `v-if="visibleSections.has('boxFill')"`
- overflowX → `v-if="visibleSections.has('overflowX')"`
- overflowY → `v-if="visibleSections.has('overflowY')"`
- flex → 将 `v-if="isFlex"` 改为 `v-if="visibleSections.has('flex') && isFlex"`
- font → `v-if="visibleSections.has('font')"`
- textDecor → `v-if="visibleSections.has('textDecor')"`
- background → `v-if="visibleSections.has('background')"`
- border → `v-if="visibleSections.has('border')"`
- effect → `v-if="visibleSections.has('effect')"`
- custom → `v-if="visibleSections.has('custom')"`

- [ ] **Step 4: 构建验证**

Run: `npx vite build --mode development`
Expected: 构建成功，无错误

- [ ] **Step 5: 标记 Plan 文件 Task 完成**

将 `### Task 1` 标记为 `### [x] Task 1`
