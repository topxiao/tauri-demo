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
