# Style Editor Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将右侧样式编辑器从 Element Plus 标准组件重写为设计工具风格的自定义 UI（按钮组 + 步进器 + 分区面板），并补充更多常用 CSS 属性。

**Architecture:** 新建 3 个可复用组件（StepperInput、ButtonGroupSelect、ColorInput），1 个新面板组件（StylePanel），重写 StyleEditor.vue 移除 tabs。数据流不变——所有编辑通过 `parseInlineStyles` / `serializeInlineStyles` 操作 `DomNode.attributes.style`。

**Tech Stack:** Vue 3 + TypeScript，不引入新依赖。

---

### Task 1: 创建 StepperInput.vue 步进器组件

**Files:**
- Create: `src/components/StepperInput.vue`

- [ ] **Step 1: 创建 StepperInput.vue**

组件功能：减号按钮 + 数值输入框 + 加号按钮 + 可选单位选择器。自动解析带单位的 CSS 值（如 `16px` → `{ value: 16, unit: 'px' }`）。

```vue
<script setup lang="ts">
import { ref, watch, computed } from 'vue'

const CSS_UNITS = ['px', 'em', 'rem', '%', 'vh', 'vw', 'pt', 'cm', 'mm']

const props = withDefaults(defineProps<{
  modelValue: string
  step?: number
  min?: number
  max?: number
  showUnit?: boolean
  placeholder?: string
}>(), {
  step: 1,
  min: undefined,
  max: undefined,
  showUnit: true,
  placeholder: '请输入',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

interface ParsedValue {
  num: number | null
  unit: string
}

function parseCssValue(raw: string): ParsedValue {
  if (!raw && raw !== '0') return { num: null, unit: 'px' }
  const match = raw.toString().match(/^(-?\d*\.?\d+)(.*)$/)
  if (!match) return { num: null, unit: 'px' }
  const num = parseFloat(match[1])
  const unit = match[2] || 'px'
  return { num: isNaN(num) ? null : num, unit: CSS_UNITS.includes(unit) ? unit : 'px' }
}

function toCssValue(num: number | null, unit: string): string {
  if (num === null) return ''
  return `${num}${unit}`
}

const parsed = computed(() => parseCssValue(props.modelValue))

const inputValue = ref<string>(parsed.value.num !== null ? String(parsed.value.num) : '')
const selectedUnit = ref<string>(parsed.value.unit)

watch(() => props.modelValue, (newVal) => {
  const p = parseCssValue(newVal)
  inputValue.value = p.num !== null ? String(p.num) : ''
  selectedUnit.value = p.unit
})

function clamp(val: number): number {
  if (props.min !== undefined && val < props.min) return props.min
  if (props.max !== undefined && val > props.max) return props.max
  return val
}

function increment() {
  const current = parsed.value.num ?? 0
  const next = clamp(Math.round((current + props.step) * 1000) / 1000)
  inputValue.value = String(next)
  emit('update:modelValue', toCssValue(next, selectedUnit.value))
}

function decrement() {
  const current = parsed.value.num ?? 0
  const next = clamp(Math.round((current - props.step) * 1000) / 1000)
  inputValue.value = String(next)
  emit('update:modelValue', toCssValue(next, selectedUnit.value))
}

function onInputChange(e: Event) {
  const target = e.target as HTMLInputElement
  inputValue.value = target.value
  if (target.value === '') {
    emit('update:modelValue', '')
  } else {
    const num = parseFloat(target.value)
    if (!isNaN(num)) {
      emit('update:modelValue', toCssValue(clamp(num), selectedUnit.value))
    }
  }
}

function onUnitChange(e: Event) {
  const target = e.target as HTMLSelectElement
  selectedUnit.value = target.value
  if (inputValue.value !== '') {
    emit('update:modelValue', toCssValue(parseFloat(inputValue.value), selectedUnit.value))
  }
}
</script>

<template>
  <div class="stepper-input">
    <button class="stepper-btn" @click="decrement">−</button>
    <input
      type="text"
      class="stepper-field"
      :value="inputValue"
      :placeholder="placeholder"
      @input="onInputChange"
    />
    <button class="stepper-btn" @click="increment">+</button>
    <select
      v-if="showUnit"
      class="stepper-unit"
      :value="selectedUnit"
      @change="onUnitChange"
    >
      <option v-for="u in CSS_UNITS" :key="u" :value="u">{{ u }}</option>
    </select>
  </div>
</template>

<style scoped>
.stepper-input {
  display: flex;
  align-items: center;
  gap: 2px;
}

.stepper-btn {
  width: 24px;
  height: 24px;
  border: 1px solid #dcdfe6;
  background: #f5f7fa;
  color: #409eff;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 3px;
  user-select: none;
}

.stepper-btn:hover {
  background: #409eff;
  color: #fff;
}

.stepper-btn:active {
  background: #337ecc;
}

.stepper-field {
  width: 52px;
  height: 24px;
  border: 1px solid #dcdfe6;
  border-radius: 3px;
  text-align: center;
  font-size: 12px;
  color: #303133;
  outline: none;
}

.stepper-field:focus {
  border-color: #409eff;
}

.stepper-field::placeholder {
  color: #c0c4cc;
  font-size: 11px;
}

.stepper-unit {
  width: 42px;
  height: 24px;
  border: 1px solid #dcdfe6;
  border-radius: 3px;
  font-size: 11px;
  color: #606266;
  outline: none;
  cursor: pointer;
  background: #fff;
}
</style>
```

---

### Task 2: 创建 ButtonGroupSelect.vue 按钮组组件

**Files:**
- Create: `src/components/ButtonGroupSelect.vue`

- [ ] **Step 1: 创建 ButtonGroupSelect.vue**

组件功能：互斥按钮组，配置驱动，选中高亮（蓝色实心），点击已选中项可取消选择。

```vue
<script setup lang="ts">
import { computed } from 'vue'

export interface ButtonOption {
  label: string
  value: string
}

const props = defineProps<{
  options: ButtonOption[]
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function handleClick(opt: ButtonOption) {
  if (props.modelValue === opt.value) {
    emit('update:modelValue', '')
  } else {
    emit('update:modelValue', opt.value)
  }
}
</script>

<template>
  <div class="btn-group">
    <button
      v-for="opt in options"
      :key="opt.value"
      :class="['btn-item', { active: modelValue === opt.value }]"
      @click="handleClick(opt)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<style scoped>
.btn-group {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.btn-item {
  height: 26px;
  padding: 0 10px;
  border: 1px solid #dcdfe6;
  background: #fff;
  color: #606266;
  font-size: 12px;
  cursor: pointer;
  border-radius: 3px;
  user-select: none;
  white-space: nowrap;
  transition: all 0.15s;
}

.btn-item:hover {
  color: #409eff;
  border-color: #c6e2ff;
  background: #ecf5ff;
}

.btn-item.active {
  color: #fff;
  background: #409eff;
  border-color: #409eff;
}
</style>
```

---

### Task 3: 创建 ColorInput.vue 颜色输入组件

**Files:**
- Create: `src/components/ColorInput.vue`

- [ ] **Step 1: 创建 ColorInput.vue**

组件功能：预览色块 + 文本输入框。点击色块打开系统颜色选择器（原生 `<input type="color">`），输入框支持直接输入 hex/颜色名。

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const textValue = ref(props.modelValue)

watch(() => props.modelValue, (val) => {
  textValue.value = val
})

function toHex(color: string): string {
  if (!color) return '#000000'
  if (color.startsWith('#') && (color.length === 7 || color.length === 4)) return color
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return '#000000'
  ctx.fillStyle = color
  return ctx.fillStyle
}

function onColorPick(e: Event) {
  const target = e.target as HTMLInputElement
  textValue.value = target.value
  emit('update:modelValue', target.value)
}

function onTextChange(e: Event) {
  const target = e.target as HTMLInputElement
  textValue.value = target.value
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="color-input">
    <label class="color-preview-wrap">
      <input
        type="color"
        class="color-picker-hidden"
        :value="toHex(modelValue)"
        @input="onColorPick"
      />
      <span class="color-preview" :style="{ background: modelValue || 'transparent' }"></span>
    </label>
    <input
      type="text"
      class="color-text"
      :value="textValue"
      placeholder="#000"
      @change="onTextChange"
    />
  </div>
</template>

<style scoped>
.color-input {
  display: flex;
  align-items: center;
  gap: 6px;
}

.color-preview-wrap {
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
}

.color-picker-hidden {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.color-preview {
  display: block;
  width: 24px;
  height: 24px;
  border: 1px solid #dcdfe6;
  border-radius: 3px;
}

.color-text {
  flex: 1;
  height: 24px;
  border: 1px solid #dcdfe6;
  border-radius: 3px;
  font-size: 12px;
  color: #303133;
  padding: 0 6px;
  outline: none;
  min-width: 60px;
}

.color-text:focus {
  border-color: #409eff;
}
</style>
```

---

### Task 4: 创建 StylePanel.vue 分区面板

**Files:**
- Create: `src/components/StylePanel.vue`

这是核心组件，包含所有 13 个分区。由于内容较多，分区逻辑按规范中定义的顺序实现。

- [ ] **Step 1: 创建 StylePanel.vue 完整实现**

```vue
<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { DomNode } from '../types'
import { useCssEditor } from '../composables/useCssEditor'
import StepperInput from './StepperInput.vue'
import ButtonGroupSelect from './ButtonGroupSelect.vue'
import ColorInput from './ColorInput.vue'

const props = defineProps<{
  element: DomNode
}>()

const emit = defineEmits<{
  change: [property: string, value: string]
}>()

const { parseInlineStyles } = useCssEditor()

// Section collapse state
const collapsed = ref<Record<string, boolean>>({
  margin: false,
  padding: false,
  size: true,
  boxFill: true,
  overflowX: true,
  overflowY: true,
  flex: false,
  font: false,
  textDecor: true,
  background: true,
  border: true,
  effect: true,
  custom: true,
})

function toggleSection(key: string) {
  collapsed.value[key] = !collapsed.value[key]
}

// Form state: flat Record<css-property, value>
const form = ref<Record<string, string>>({})

// Computed: is display flex
const isFlex = computed(() => form.value['display'] === 'flex')

// Background mode: '' | 'color' | 'image'
const bgMode = computed(() => {
  const bg = form.value['background-color']
  const bgImg = form.value['background-image']
  if (bgImg) return 'image'
  if (bg) return 'color'
  return ''
})

function setBgMode(mode: string) {
  if (mode === bgMode.value) {
    emit('change', 'background-color', '')
    emit('change', 'background-image', '')
  } else if (mode === 'color') {
    emit('change', 'background-image', '')
  } else if (mode === 'image') {
    emit('change', 'background-color', '')
  }
}

// Border radius corners
const radiusCorners = computed(() => {
  const raw = form.value['border-radius'] || ''
  const parts = raw.split(/\s+/)
  return {
    topLeft: parts[0] || '',
    topRight: parts[1] || parts[0] || '',
    bottomRight: parts[2] || parts[0] || '',
    bottomLeft: parts[3] || parts[1] || parts[0] || '',
  }
})

function setRadiusCorner(corner: 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft', val: string) {
  const c = { ...radiusCorners.value, [corner]: val }
  const { topLeft, topRight, bottomRight, bottomLeft } = c
  if (topLeft === topRight && topRight === bottomRight && bottomRight === bottomLeft) {
    handleChange('border-radius', topLeft)
  } else if (topRight === bottomLeft && topLeft === bottomRight) {
    handleChange('border-radius', `${topLeft} ${topRight}`)
  } else {
    handleChange('border-radius', `${topLeft} ${topRight} ${bottomRight} ${bottomLeft}`)
  }
}

// Box fill: '' | 'auto' | 'flex:1' | 'flex:2'
const boxFillValue = computed(() => {
  const f = form.value['flex']
  if (f === '1') return 'flex:1'
  if (f === '2') return 'flex:2'
  const w = form.value['width']
  if (w === 'auto') return 'auto'
  return ''
})

function setBoxFill(val: string) {
  if (val === boxFillValue.value) {
    emit('change', 'flex', '')
    emit('change', 'width', '')
    return
  }
  if (val === 'auto') {
    emit('change', 'width', 'auto')
    emit('change', 'flex', '')
  } else if (val === 'flex:1') {
    emit('change', 'flex', '1')
    emit('change', 'width', '')
  } else if (val === 'flex:2') {
    emit('change', 'flex', '2')
    emit('change', 'width', '')
  }
}

// Custom properties
const customProps = ref<{ key: string; value: string }[]>([])

// Tracked properties (those managed by the panel UI)
const trackedProps = [
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'width', 'height', 'max-width', 'max-height',
  'flex', 'display',
  'overflow-x', 'overflow-y',
  'flex-direction', 'justify-content', 'align-items', 'flex-wrap', 'gap',
  'font-weight', 'font-size', 'line-height', 'text-align', 'color',
  'text-decoration', 'letter-spacing',
  'background-color', 'background-image',
  'border-width', 'border-style', 'border-color', 'border-radius',
  'opacity', 'box-shadow',
]

function loadFromElement() {
  const styles = parseInlineStyles(props.element)
  const init: Record<string, string> = {}
  for (const key of trackedProps) {
    init[key] = styles[key] || ''
  }
  form.value = init
  customProps.value = []

  // Load untracked properties as custom
  for (const [key, val] of Object.entries(styles)) {
    if (!trackedProps.includes(key)) {
      customProps.value.push({ key, value: val })
    }
  }
}

watch(() => props.element.id, () => {
  loadFromElement()
}, { immediate: true })

function handleChange(property: string, value: string) {
  form.value[property] = value
  emit('change', property, value)
}

function addCustomProp() {
  customProps.value.push({ key: '', value: '' })
}

function removeCustomProp(index: number) {
  const prop = customProps.value[index]
  if (prop.key.trim()) {
    emit('change', prop.key.trim(), '')
  }
  customProps.value.splice(index, 1)
}

function applyCustomProp(index: number) {
  const prop = customProps.value[index]
  if (prop.key.trim()) {
    emit('change', prop.key.trim(), prop.value)
  }
}
</script>

<template>
  <div class="style-panel">
    <!-- 外边距 -->
    <section class="panel-section">
      <div class="section-header" @click="toggleSection('margin')">
        <span class="section-arrow">{{ collapsed.margin ? '▶' : '▼' }}</span>
        <span class="section-title">外边距</span>
      </div>
      <div v-show="!collapsed.margin" class="section-body">
        <div class="field-row">
          <label>上</label>
          <StepperInput :model-value="form['margin-top']" @update:model-value="handleChange('margin-top', $event)" />
        </div>
        <div class="field-row">
          <label>右</label>
          <StepperInput :model-value="form['margin-right']" @update:model-value="handleChange('margin-right', $event)" />
        </div>
        <div class="field-row">
          <label>下</label>
          <StepperInput :model-value="form['margin-bottom']" @update:model-value="handleChange('margin-bottom', $event)" />
        </div>
        <div class="field-row">
          <label>左</label>
          <StepperInput :model-value="form['margin-left']" @update:model-value="handleChange('margin-left', $event)" />
        </div>
      </div>
    </section>

    <!-- 间距（内边距） -->
    <section class="panel-section">
      <div class="section-header" @click="toggleSection('padding')">
        <span class="section-arrow">{{ collapsed.padding ? '▶' : '▼' }}</span>
        <span class="section-title">间距</span>
      </div>
      <div v-show="!collapsed.padding" class="section-body">
        <div class="field-row">
          <label>上</label>
          <StepperInput :model-value="form['padding-top']" @update:model-value="handleChange('padding-top', $event)" />
        </div>
        <div class="field-row">
          <label>右</label>
          <StepperInput :model-value="form['padding-right']" @update:model-value="handleChange('padding-right', $event)" />
        </div>
        <div class="field-row">
          <label>下</label>
          <StepperInput :model-value="form['padding-bottom']" @update:model-value="handleChange('padding-bottom', $event)" />
        </div>
        <div class="field-row">
          <label>左</label>
          <StepperInput :model-value="form['padding-left']" @update:model-value="handleChange('padding-left', $event)" />
        </div>
      </div>
    </section>

    <!-- 尺寸 -->
    <section class="panel-section">
      <div class="section-header" @click="toggleSection('size')">
        <span class="section-arrow">{{ collapsed.size ? '▶' : '▼' }}</span>
        <span class="section-title">尺寸</span>
      </div>
      <div v-show="!collapsed.size" class="section-body">
        <div class="field-row">
          <label>宽度</label>
          <StepperInput :model-value="form['width']" @update:model-value="handleChange('width', $event)" />
        </div>
        <div class="field-row">
          <label>高度</label>
          <StepperInput :model-value="form['height']" @update:model-value="handleChange('height', $event)" />
        </div>
        <div class="field-row">
          <label>最大宽</label>
          <StepperInput :model-value="form['max-width']" @update:model-value="handleChange('max-width', $event)" />
        </div>
        <div class="field-row">
          <label>最大高</label>
          <StepperInput :model-value="form['max-height']" @update:model-value="handleChange('max-height', $event)" />
        </div>
      </div>
    </section>

    <!-- 盒宽填充 -->
    <section class="panel-section">
      <div class="section-header" @click="toggleSection('boxFill')">
        <span class="section-arrow">{{ collapsed.boxFill ? '▶' : '▼' }}</span>
        <span class="section-title">盒宽填充</span>
      </div>
      <div v-show="!collapsed.boxFill" class="section-body">
        <ButtonGroupSelect
          :model-value="boxFillValue"
          @update:model-value="setBoxFill"
          :options="[
            { label: '无', value: '' },
            { label: '自动', value: 'auto' },
            { label: '1等分', value: 'flex:1' },
            { label: '2等分', value: 'flex:2' },
          ]"
        />
      </div>
    </section>

    <!-- 横轴溢出 -->
    <section class="panel-section">
      <div class="section-header" @click="toggleSection('overflowX')">
        <span class="section-arrow">{{ collapsed.overflowX ? '▶' : '▼' }}</span>
        <span class="section-title">横轴溢出</span>
      </div>
      <div v-show="!collapsed.overflowX" class="section-body">
        <ButtonGroupSelect
          :model-value="form['overflow-x']"
          @update:model-value="handleChange('overflow-x', $event)"
          :options="[
            { label: '默认', value: 'visible' },
            { label: '自动', value: 'auto' },
            { label: '隐藏', value: 'hidden' },
            { label: '滚动', value: 'scroll' },
          ]"
        />
      </div>
    </section>

    <!-- 纵轴溢出 -->
    <section class="panel-section">
      <div class="section-header" @click="toggleSection('overflowY')">
        <span class="section-arrow">{{ collapsed.overflowY ? '▶' : '▼' }}</span>
        <span class="section-title">纵轴溢出</span>
      </div>
      <div v-show="!collapsed.overflowY" class="section-body">
        <ButtonGroupSelect
          :model-value="form['overflow-y']"
          @update:model-value="handleChange('overflow-y', $event)"
          :options="[
            { label: '默认', value: 'visible' },
            { label: '自动', value: 'auto' },
            { label: '隐藏', value: 'hidden' },
            { label: '滚动', value: 'scroll' },
          ]"
        />
      </div>
    </section>

    <!-- Flex 布局（条件显示） -->
    <section v-if="isFlex" class="panel-section">
      <div class="section-header" @click="toggleSection('flex')">
        <span class="section-arrow">{{ collapsed.flex ? '▶' : '▼' }}</span>
        <span class="section-title">Flex 布局</span>
      </div>
      <div v-show="!collapsed.flex" class="section-body">
        <div class="field-row">
          <label>方向</label>
          <ButtonGroupSelect
            :model-value="form['flex-direction']"
            @update:model-value="handleChange('flex-direction', $event)"
            :options="[
              { label: '横', value: 'row' },
              { label: '横反', value: 'row-reverse' },
              { label: '纵', value: 'column' },
              { label: '纵反', value: 'column-reverse' },
            ]"
          />
        </div>
        <div class="field-row">
          <label>主轴</label>
          <ButtonGroupSelect
            :model-value="form['justify-content']"
            @update:model-value="handleChange('justify-content', $event)"
            :options="[
              { label: '起始', value: 'flex-start' },
              { label: '居中', value: 'center' },
              { label: '末尾', value: 'flex-end' },
              { label: '之间', value: 'space-between' },
              { label: '周围', value: 'space-around' },
            ]"
          />
        </div>
        <div class="field-row">
          <label>交叉轴</label>
          <ButtonGroupSelect
            :model-value="form['align-items']"
            @update:model-value="handleChange('align-items', $event)"
            :options="[
              { label: '起始', value: 'flex-start' },
              { label: '居中', value: 'center' },
              { label: '末尾', value: 'flex-end' },
              { label: '拉伸', value: 'stretch' },
            ]"
          />
        </div>
        <div class="field-row">
          <label>换行</label>
          <ButtonGroupSelect
            :model-value="form['flex-wrap']"
            @update:model-value="handleChange('flex-wrap', $event)"
            :options="[
              { label: '不换行', value: 'nowrap' },
              { label: '换行', value: 'wrap' },
            ]"
          />
        </div>
        <div class="field-row">
          <label>间距</label>
          <StepperInput :model-value="form['gap']" @update:model-value="handleChange('gap', $event)" />
        </div>
      </div>
    </section>

    <!-- 字体 -->
    <section class="panel-section">
      <div class="section-header" @click="toggleSection('font')">
        <span class="section-arrow">{{ collapsed.font ? '▶' : '▼' }}</span>
        <span class="section-title">字体</span>
      </div>
      <div v-show="!collapsed.font" class="section-body">
        <div class="field-row">
          <label>粗细</label>
          <ButtonGroupSelect
            :model-value="form['font-weight']"
            @update:model-value="handleChange('font-weight', $event)"
            :options="[
              { label: '细', value: '300' },
              { label: '正常', value: '400' },
              { label: '粗', value: '700' },
            ]"
          />
        </div>
        <div class="field-row">
          <label>大小</label>
          <StepperInput :model-value="form['font-size']" @update:model-value="handleChange('font-size', $event)" />
        </div>
        <div class="field-row">
          <label>行高</label>
          <StepperInput :model-value="form['line-height']" @update:model-value="handleChange('line-height', $event)" />
        </div>
        <div class="field-row">
          <label>对齐</label>
          <ButtonGroupSelect
            :model-value="form['text-align']"
            @update:model-value="handleChange('text-align', $event)"
            :options="[
              { label: '左', value: 'left' },
              { label: '中', value: 'center' },
              { label: '右', value: 'right' },
              { label: '两端', value: 'justify' },
            ]"
          />
        </div>
        <div class="field-row">
          <label>颜色</label>
          <ColorInput :model-value="form['color']" @update:model-value="handleChange('color', $event)" />
        </div>
      </div>
    </section>

    <!-- 文字装饰 -->
    <section class="panel-section">
      <div class="section-header" @click="toggleSection('textDecor')">
        <span class="section-arrow">{{ collapsed.textDecor ? '▶' : '▼' }}</span>
        <span class="section-title">文字装饰</span>
      </div>
      <div v-show="!collapsed.textDecor" class="section-body">
        <div class="field-row">
          <label>装饰</label>
          <ButtonGroupSelect
            :model-value="form['text-decoration']"
            @update:model-value="handleChange('text-decoration', $event)"
            :options="[
              { label: '无', value: 'none' },
              { label: '下划线', value: 'underline' },
              { label: '删除线', value: 'line-through' },
            ]"
          />
        </div>
        <div class="field-row">
          <label>字距</label>
          <StepperInput :model-value="form['letter-spacing']" :step="0.5" @update:model-value="handleChange('letter-spacing', $event)" />
        </div>
      </div>
    </section>

    <!-- 背景设置 -->
    <section class="panel-section">
      <div class="section-header" @click="toggleSection('background')">
        <span class="section-arrow">{{ collapsed.background ? '▶' : '▼' }}</span>
        <span class="section-title">背景设置</span>
      </div>
      <div v-show="!collapsed.background" class="section-body">
        <div class="field-row">
          <label>填充</label>
          <ButtonGroupSelect
            :model-value="bgMode"
            @update:model-value="setBgMode"
            :options="[
              { label: '无', value: '' },
              { label: '颜色', value: 'color' },
              { label: '图片', value: 'image' },
            ]"
          />
        </div>
        <div v-if="bgMode === 'color'" class="field-row">
          <label>背景色</label>
          <ColorInput :model-value="form['background-color']" @update:model-value="handleChange('background-color', $event)" />
        </div>
        <div v-if="bgMode === 'image'" class="field-row">
          <label>图片</label>
          <input
            type="text"
            class="text-input"
            :value="form['background-image']"
            placeholder="url(...)"
            @input="handleChange('background-image', ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>
    </section>

    <!-- 边框 -->
    <section class="panel-section">
      <div class="section-header" @click="toggleSection('border')">
        <span class="section-arrow">{{ collapsed.border ? '▶' : '▼' }}</span>
        <span class="section-title">边框</span>
      </div>
      <div v-show="!collapsed.border" class="section-body">
        <div class="field-row">
          <label>宽度</label>
          <StepperInput :model-value="form['border-width']" @update:model-value="handleChange('border-width', $event)" />
        </div>
        <div class="field-row">
          <label>样式</label>
          <ButtonGroupSelect
            :model-value="form['border-style']"
            @update:model-value="handleChange('border-style', $event)"
            :options="[
              { label: '无', value: 'none' },
              { label: '实线', value: 'solid' },
              { label: '虚线', value: 'dashed' },
              { label: '点线', value: 'dotted' },
            ]"
          />
        </div>
        <div class="field-row">
          <label>颜色</label>
          <ColorInput :model-value="form['border-color']" @update:model-value="handleChange('border-color', $event)" />
        </div>
        <div class="sub-label">圆角</div>
        <div class="field-row">
          <label>左上</label>
          <StepperInput :model-value="radiusCorners.topLeft" @update:model-value="setRadiusCorner('topLeft', $event)" />
        </div>
        <div class="field-row">
          <label>右上</label>
          <StepperInput :model-value="radiusCorners.topRight" @update:model-value="setRadiusCorner('topRight', $event)" />
        </div>
        <div class="field-row">
          <label>右下</label>
          <StepperInput :model-value="radiusCorners.bottomRight" @update:model-value="setRadiusCorner('bottomRight', $event)" />
        </div>
        <div class="field-row">
          <label>左下</label>
          <StepperInput :model-value="radiusCorners.bottomLeft" @update:model-value="setRadiusCorner('bottomLeft', $event)" />
        </div>
      </div>
    </section>

    <!-- 效果 -->
    <section class="panel-section">
      <div class="section-header" @click="toggleSection('effect')">
        <span class="section-arrow">{{ collapsed.effect ? '▶' : '▼' }}</span>
        <span class="section-title">效果</span>
      </div>
      <div v-show="!collapsed.effect" class="section-body">
        <div class="field-row">
          <label>透明度</label>
          <div class="slider-wrap">
            <input
              type="range"
              class="slider"
              min="0"
              max="100"
              :value="form['opacity'] !== '' ? Math.round(parseFloat(form['opacity']) * 100) : 100"
              @input="handleChange('opacity', String(($event.target as HTMLInputElement).valueAsNumber / 100))"
            />
            <span class="slider-val">{{ form['opacity'] !== '' ? Math.round(parseFloat(form['opacity']) * 100) : 100 }}%</span>
          </div>
        </div>
        <div class="field-row">
          <label>阴影</label>
          <input
            type="text"
            class="text-input"
            :value="form['box-shadow']"
            placeholder="0 2px 4px rgba(0,0,0,.1)"
            @input="handleChange('box-shadow', ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>
    </section>

    <!-- 自定义属性 -->
    <section class="panel-section">
      <div class="section-header" @click="toggleSection('custom')">
        <span class="section-arrow">{{ collapsed.custom ? '▶' : '▼' }}</span>
        <span class="section-title">自定义属性</span>
      </div>
      <div v-show="!collapsed.custom" class="section-body">
        <div v-for="(prop, index) in customProps" :key="index" class="custom-row">
          <input
            type="text"
            class="text-input custom-key"
            v-model="prop.key"
            placeholder="属性名"
          />
          <input
            type="text"
            class="text-input custom-val"
            v-model="prop.value"
            placeholder="属性值"
            @change="applyCustomProp(index)"
          />
          <button class="remove-btn" @click="removeCustomProp(index)">×</button>
        </div>
        <button class="add-btn" @click="addCustomProp">+ 添加属性</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.style-panel {
  padding: 0 8px 8px;
}

.panel-section {
  border-bottom: 1px solid #f0f0f0;
}

.panel-section:last-child {
  border-bottom: none;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 4px;
  cursor: pointer;
  user-select: none;
}

.section-header:hover {
  background: #f5f7fa;
}

.section-arrow {
  font-size: 10px;
  color: #909399;
  width: 12px;
}

.section-title {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
}

.section-body {
  padding: 4px 4px 8px 16px;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.field-row > label {
  min-width: 40px;
  font-size: 12px;
  color: #606266;
  flex-shrink: 0;
}

.sub-label {
  font-size: 12px;
  color: #909399;
  margin: 4px 0 2px;
}

.text-input {
  flex: 1;
  height: 24px;
  border: 1px solid #dcdfe6;
  border-radius: 3px;
  font-size: 12px;
  color: #303133;
  padding: 0 6px;
  outline: none;
  min-width: 0;
}

.text-input:focus {
  border-color: #409eff;
}

.text-input::placeholder {
  color: #c0c4cc;
  font-size: 11px;
}

.slider-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.slider {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: #e4e7ed;
  border-radius: 2px;
  outline: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  background: #409eff;
  border-radius: 50%;
  cursor: pointer;
}

.slider-val {
  font-size: 12px;
  color: #606266;
  min-width: 36px;
  text-align: right;
}

.custom-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}

.custom-key {
  width: 80px;
  flex: none;
}

.custom-val {
  flex: 1;
}

.remove-btn {
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: #f56c6c;
  font-size: 14px;
  cursor: pointer;
  flex-shrink: 0;
}

.remove-btn:hover {
  color: #e6363a;
}

.add-btn {
  border: 1px dashed #dcdfe6;
  background: transparent;
  color: #909399;
  font-size: 12px;
  width: 100%;
  height: 26px;
  cursor: pointer;
  border-radius: 3px;
}

.add-btn:hover {
  border-color: #409eff;
  color: #409eff;
}
</style>
```

---

### Task 5: 重写 StyleEditor.vue

**Files:**
- Modify: `src/components/StyleEditor.vue`

移除 tabs 和 rule cards，简化为元素信息栏 + StylePanel。

- [ ] **Step 1: 重写 StyleEditor.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useDomTreeStore } from '../stores/domTree'
import { useProjectStore } from '../stores/project'
import { useCssEditor } from '../composables/useCssEditor'
import StylePanel from './StylePanel.vue'

const domTreeStore = useDomTreeStore()
const projectStore = useProjectStore()
const cssEditor = useCssEditor()

const selectedElement = computed(() => domTreeStore.selectedNode)

const elementLabel = computed(() => {
  const el = selectedElement.value
  if (!el || el.type !== 'element' || !el.tagName) return ''
  const tag = el.tagName
  const cls = el.attributes?.['class']
  const id = el.attributes?.['id']
  let label = `<${tag}`
  if (id) label += `#${id}`
  if (cls) {
    const classes = cls.split(/\s+/).join('.')
    label += `.${classes}`
  }
  label += '>'
  return label
})

function handleStylePropertyChange(property: string, value: string) {
  const el = selectedElement.value
  if (!el) return

  const styles = cssEditor.parseInlineStyles(el)

  if (value === '') {
    delete styles[property]
  } else {
    styles[property] = value
  }

  const newStyle = cssEditor.serializeInlineStyles(styles)
  domTreeStore.updateNodeAttribute(el.id, 'style', newStyle)
  projectStore.markDirty()
}
</script>

<template>
  <div class="style-editor">
    <div v-if="!selectedElement || selectedElement.type !== 'element'" class="empty-state">
      请在 DOM 树中选择一个元素
    </div>
    <template v-else>
      <div class="element-info">
        <span class="element-tag">{{ elementLabel }}</span>
      </div>
      <StylePanel
        :element="selectedElement"
        @change="handleStylePropertyChange"
      />
    </template>
  </div>
</template>

<style scoped>
.style-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background: #fff;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
  font-size: 14px;
}

.element-info {
  padding: 8px 12px;
  border-bottom: 1px solid #e4e7ed;
  background: #f5f7fa;
  flex-shrink: 0;
}

.element-tag {
  font-family: monospace;
  font-size: 13px;
  color: #303133;
}
</style>
```

---

### Task 6: 删除旧组件并更新 AppLayout 引用

**Files:**
- Delete: `src/components/StylePropertyGroups.vue`
- Modify: `src/components/AppLayout.vue` (如有 StylePropertyGroups 的 import 需清理)

- [ ] **Step 1: 删除 StylePropertyGroups.vue 并检查 AppLayout 引用**

删除 `src/components/StylePropertyGroups.vue`。AppLayout.vue 中没有直接引用 StylePropertyGroups（它通过 StyleEditor 间接引用），无需修改 AppLayout。

---

### Task 7: 验证

- [ ] **Step 1: 启动应用验证**

Run: `cd d:/Workspace/cusor_workspace/tauri-demo && npm run tauri dev`

验证项：
1. 右侧面板无 tabs，直接显示分区面板
2. 每个分区可折叠/展开
3. 步进器 ± 按钮正常增减值
4. 按钮组互斥选择正常
5. 颜色输入预览和文本输入正常
6. 修改属性后 iframe 预览实时更新
7. 切换元素时面板数据刷新
8. Flex 布局分区在 display=flex 时显示
9. 背景设置切换颜色/图片模式正常
