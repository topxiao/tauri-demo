<script setup lang="ts">
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
