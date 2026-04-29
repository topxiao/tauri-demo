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
