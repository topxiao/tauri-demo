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
