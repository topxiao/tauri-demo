<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { DomNode } from '../types'
import { useCssEditor } from '../composables/useCssEditor'

const props = defineProps<{
  element: DomNode
}>()

const emit = defineEmits<{
  change: [property: string, value: string]
}>()

const { parseInlineStyles } = useCssEditor()

const form = ref<Record<string, string>>({})

const display = computed(() => form.value['display'] || '')

// Shorthand expanders for margin/padding (simplified: single value)
function parseShorthand(val: string): Record<string, string> {
  const parts = val.trim().split(/\s+/)
  if (parts.length === 1) {
    return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] }
  }
  if (parts.length === 2) {
    return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] }
  }
  if (parts.length === 3) {
    return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] }
  }
  return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] }
}

function toShorthand(v: Record<string, string>): string {
  const { top, right, bottom, left } = v
  if (top === right && right === bottom && bottom === left) return top
  if (top === bottom && left === right) return `${top} ${right}`
  if (left === right) return `${top} ${right} ${bottom}`
  return `${top} ${right} ${bottom} ${left}`
}

// Custom properties
const customProps = ref<{ key: string; value: string }[]>([])

function addCustomProp() {
  customProps.value.push({ key: '', value: '' })
}

function removeCustomProp(index: number) {
  customProps.value.splice(index, 1)
}

function applyCustomProp(index: number) {
  const prop = customProps.value[index]
  if (prop.key.trim()) {
    emit('change', prop.key.trim(), prop.value)
  }
}

function handleChange(property: string, value: string) {
  // For shorthand margin/padding, expand into the shorthand string
  if (['margin-top', 'margin-right', 'margin-bottom', 'margin-left'].includes(property)) {
    const current = form.value['margin'] || ''
    const expanded = parseShorthand(current)
    const side = property.replace('margin-', '') as keyof typeof expanded
    expanded[side] = value
    const shorthand = toShorthand(expanded)
    form.value['margin'] = shorthand
    emit('change', 'margin', shorthand)
    return
  }
  if (['padding-top', 'padding-right', 'padding-bottom', 'padding-left'].includes(property)) {
    const current = form.value['padding'] || ''
    const expanded = parseShorthand(current)
    const side = property.replace('padding-', '') as keyof typeof expanded
    expanded[side] = value
    const shorthand = toShorthand(expanded)
    form.value['padding'] = shorthand
    emit('change', 'padding', shorthand)
    return
  }

  form.value[property] = value
  emit('change', property, value)
}

function loadFromElement() {
  const styles = parseInlineStyles(props.element)
  const initialized: Record<string, string> = {}

  const fields = [
    'display', 'position', 'width', 'height',
    'flex-direction', 'justify-content', 'align-items',
    'margin', 'padding',
    'font-family', 'font-size', 'font-weight', 'line-height', 'text-align', 'color',
    'background-color',
    'border-width', 'border-style', 'border-color', 'border-radius',
  ]

  for (const field of fields) {
    initialized[field] = styles[field] || ''
  }

  form.value = initialized
  customProps.value = []
}

watch(() => props.element.id, () => {
  loadFromElement()
}, { immediate: true })

const selectOptions: Record<string, string[]> = {
  display: ['block', 'inline', 'inline-block', 'flex', 'grid', 'none'],
  position: ['static', 'relative', 'absolute', 'fixed', 'sticky'],
  'flex-direction': ['row', 'row-reverse', 'column', 'column-reverse'],
  'justify-content': ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'],
  'align-items': ['flex-start', 'flex-end', 'center', 'stretch', 'baseline'],
  'font-weight': ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
  'text-align': ['left', 'center', 'right', 'justify'],
  'border-style': ['none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge'],
}
</script>

<template>
  <el-collapse>
    <!-- Layout -->
    <el-collapse-item title="&#x1F4D0; 布局" name="layout">
      <div class="prop-row">
        <label>display</label>
        <el-select
          :model-value="form['display']"
          @update:model-value="handleChange('display', $event)"
          placeholder="display"
          clearable
          size="small"
        >
          <el-option v-for="o in selectOptions.display" :key="o" :label="o" :value="o" />
        </el-select>
      </div>
      <div class="prop-row">
        <label>position</label>
        <el-select
          :model-value="form['position']"
          @update:model-value="handleChange('position', $event)"
          placeholder="position"
          clearable
          size="small"
        >
          <el-option v-for="o in selectOptions.position" :key="o" :label="o" :value="o" />
        </el-select>
      </div>
      <div class="prop-row">
        <label>width</label>
        <el-input
          :model-value="form['width']"
          @update:model-value="handleChange('width', $event)"
          placeholder="width"
          size="small"
        />
      </div>
      <div class="prop-row">
        <label>height</label>
        <el-input
          :model-value="form['height']"
          @update:model-value="handleChange('height', $event)"
          placeholder="height"
          size="small"
        />
      </div>
    </el-collapse-item>

    <!-- Flexbox (only when display === flex) -->
    <el-collapse-item v-if="display === 'flex'" title="&#x1F504; Flexbox" name="flexbox">
      <div class="prop-row">
        <label>flex-direction</label>
        <el-select
          :model-value="form['flex-direction']"
          @update:model-value="handleChange('flex-direction', $event)"
          placeholder="flex-direction"
          clearable
          size="small"
        >
          <el-option v-for="o in selectOptions['flex-direction']" :key="o" :label="o" :value="o" />
        </el-select>
      </div>
      <div class="prop-row">
        <label>justify-content</label>
        <el-select
          :model-value="form['justify-content']"
          @update:model-value="handleChange('justify-content', $event)"
          placeholder="justify-content"
          clearable
          size="small"
        >
          <el-option v-for="o in selectOptions['justify-content']" :key="o" :label="o" :value="o" />
        </el-select>
      </div>
      <div class="prop-row">
        <label>align-items</label>
        <el-select
          :model-value="form['align-items']"
          @update:model-value="handleChange('align-items', $event)"
          placeholder="align-items"
          clearable
          size="small"
        >
          <el-option v-for="o in selectOptions['align-items']" :key="o" :label="o" :value="o" />
        </el-select>
      </div>
    </el-collapse-item>

    <!-- Spacing with box model -->
    <el-collapse-item title="&#x2194;&#xFE0F; 间距" name="spacing">
      <div class="box-model">
        <div class="box-margin">
          <span class="box-label">margin</span>
          <el-input
            :model-value="form['margin']"
            @update:model-value="handleChange('margin', $event)"
            placeholder="margin"
            size="small"
          />
        </div>
        <div class="box-padding">
          <span class="box-label">padding</span>
          <el-input
            :model-value="form['padding']"
            @update:model-value="handleChange('padding', $event)"
            placeholder="padding"
            size="small"
          />
        </div>
        <div class="box-content">
          content
        </div>
      </div>
    </el-collapse-item>

    <!-- Typography -->
    <el-collapse-item title="&#x1F524; 排版" name="typography">
      <div class="prop-row">
        <label>font-family</label>
        <el-input
          :model-value="form['font-family']"
          @update:model-value="handleChange('font-family', $event)"
          placeholder="font-family"
          size="small"
        />
      </div>
      <div class="prop-row">
        <label>font-size</label>
        <el-input
          :model-value="form['font-size']"
          @update:model-value="handleChange('font-size', $event)"
          placeholder="font-size"
          size="small"
        />
      </div>
      <div class="prop-row">
        <label>font-weight</label>
        <el-select
          :model-value="form['font-weight']"
          @update:model-value="handleChange('font-weight', $event)"
          placeholder="font-weight"
          clearable
          size="small"
        >
          <el-option v-for="o in selectOptions['font-weight']" :key="o" :label="o" :value="o" />
        </el-select>
      </div>
      <div class="prop-row">
        <label>line-height</label>
        <el-input
          :model-value="form['line-height']"
          @update:model-value="handleChange('line-height', $event)"
          placeholder="line-height"
          size="small"
        />
      </div>
      <div class="prop-row">
        <label>text-align</label>
        <el-select
          :model-value="form['text-align']"
          @update:model-value="handleChange('text-align', $event)"
          placeholder="text-align"
          clearable
          size="small"
        >
          <el-option v-for="o in selectOptions['text-align']" :key="o" :label="o" :value="o" />
        </el-select>
      </div>
      <div class="prop-row">
        <label>color</label>
        <div class="color-field">
          <el-color-picker
            :model-value="form['color']"
            @update:model-value="handleChange('color', $event || '')"
            size="small"
          />
          <el-input
            :model-value="form['color']"
            @update:model-value="handleChange('color', $event)"
            placeholder="color"
            size="small"
          />
        </div>
      </div>
    </el-collapse-item>

    <!-- Background -->
    <el-collapse-item title="&#x1F3A8; 背景" name="background">
      <div class="prop-row">
        <label>background-color</label>
        <div class="color-field">
          <el-color-picker
            :model-value="form['background-color']"
            @update:model-value="handleChange('background-color', $event || '')"
            size="small"
          />
          <el-input
            :model-value="form['background-color']"
            @update:model-value="handleChange('background-color', $event)"
            placeholder="background-color"
            size="small"
          />
        </div>
      </div>
    </el-collapse-item>

    <!-- Border -->
    <el-collapse-item title="&#x1F532; 边框" name="border">
      <div class="prop-row">
        <label>border-width</label>
        <el-input
          :model-value="form['border-width']"
          @update:model-value="handleChange('border-width', $event)"
          placeholder="border-width"
          size="small"
        />
      </div>
      <div class="prop-row">
        <label>border-style</label>
        <el-select
          :model-value="form['border-style']"
          @update:model-value="handleChange('border-style', $event)"
          placeholder="border-style"
          clearable
          size="small"
        >
          <el-option v-for="o in selectOptions['border-style']" :key="o" :label="o" :value="o" />
        </el-select>
      </div>
      <div class="prop-row">
        <label>border-color</label>
        <div class="color-field">
          <el-color-picker
            :model-value="form['border-color']"
            @update:model-value="handleChange('border-color', $event || '')"
            size="small"
          />
          <el-input
            :model-value="form['border-color']"
            @update:model-value="handleChange('border-color', $event)"
            placeholder="border-color"
            size="small"
          />
        </div>
      </div>
      <div class="prop-row">
        <label>border-radius</label>
        <el-input
          :model-value="form['border-radius']"
          @update:model-value="handleChange('border-radius', $event)"
          placeholder="border-radius"
          size="small"
        />
      </div>
    </el-collapse-item>

    <!-- Custom properties -->
    <el-collapse-item title="&#x2699;&#xFE0F; 自定义属性" name="custom">
      <div v-for="(prop, index) in customProps" :key="index" class="custom-prop-row">
        <el-input
          v-model="prop.key"
          placeholder="属性名"
          size="small"
          class="custom-input"
        />
        <el-input
          v-model="prop.value"
          placeholder="属性值"
          size="small"
          class="custom-input"
        />
        <el-button size="small" type="primary" @click="applyCustomProp(index)">
          应用
        </el-button>
        <el-button size="small" type="danger" @click="removeCustomProp(index)">
          删除
        </el-button>
      </div>
      <el-button size="small" @click="addCustomProp">
        + 添加属性
      </el-button>
    </el-collapse-item>
  </el-collapse>
</template>

<style scoped>
.prop-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.prop-row label {
  min-width: 80px;
  font-size: 12px;
  color: #606266;
  flex-shrink: 0;
}

.prop-row :deep(.el-select),
.prop-row :deep(.el-input) {
  flex: 1;
}

.color-field {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.color-field :deep(.el-input) {
  flex: 1;
}

.box-model {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
}

.box-margin {
  width: 100%;
  border: 1px dashed #dcdfe6;
  padding: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.box-padding {
  width: 90%;
  border: 1px dashed #c0c4cc;
  padding: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.box-content {
  width: 80%;
  background: #f5f7fa;
  text-align: center;
  font-size: 12px;
  color: #909399;
  padding: 8px;
  border: 1px solid #e4e7ed;
}

.box-label {
  font-size: 11px;
  color: #909399;
}

.box-margin :deep(.el-input),
.box-padding :deep(.el-input) {
  width: 100%;
}

.custom-prop-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
}

.custom-input {
  flex: 1;
}
</style>
