<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useDomTreeStore } from '../stores/domTree'
import { useProjectStore } from '../stores/project'
import { useHtmlParser } from '../composables/useHtmlParser'
import { useIframeSync } from '../composables/useIframeSync'

const domTreeStore = useDomTreeStore()
const projectStore = useProjectStore()
const { domTreeToHtml } = useHtmlParser()
const { setIframeRef, highlight, unhighlight, prepareHtmlForPreview } = useIframeSync()

const iframeEl = ref<HTMLIFrameElement | null>(null)
const previousSelectedId = ref<string | null>(null)
const viewMode = ref<'preview' | 'source'>('preview')

const selectedLabel = computed(() => {
  const node = domTreeStore.selectedNode
  if (!node) return ''
  if (node.type === 'text') return '#text'
  if (node.type === 'comment') return '#comment'
  let label = node.tagName || 'unknown'
  if (node.attributes?.class) {
    label += '.' + node.attributes.class.split(/\s+/).join('.')
  }
  if (node.attributes?.id) {
    label += '#' + node.attributes.id
  }
  return label
})

const previewHtml = computed(() => {
  const tree = domTreeStore.domTree
  if (tree.length === 0) return ''
  const rawHtml = domTreeToHtml(tree)
  return prepareHtmlForPreview(rawHtml, tree)
})

const sourceCode = computed(() => {
  const tree = domTreeStore.domTree
  if (tree.length === 0) return ''
  return domTreeToHtml(tree)
})

function onIframeLoad() {
  setIframeRef(iframeEl.value)
}

function handleMessage(e: MessageEvent) {
  if (!e.data || !e.data.type) return
  if (e.data.type === 'elementClicked' && e.data.nodeId) {
    domTreeStore.selectNode(e.data.nodeId)
  } else if (e.data.type === 'selectionCleared') {
    domTreeStore.clearSelection()
  }
}

watch(
  () => domTreeStore.selectedNodeId,
  (newId) => {
    if (previousSelectedId.value && previousSelectedId.value !== newId) {
      unhighlight(previousSelectedId.value)
    }
    if (newId) {
      highlight(newId)
    }
    previousSelectedId.value = newId
  },
)

onMounted(() => {
  window.addEventListener('message', handleMessage)
})

onUnmounted(() => {
  window.removeEventListener('message', handleMessage)
})
</script>

<template>
  <div class="preview-pane">
    <div class="preview-status-bar">
      <div class="mode-toggle">
        <button
          :class="['toggle-btn', { active: viewMode === 'preview' }]"
          @click="viewMode = 'preview'"
        >预览</button>
        <button
          :class="['toggle-btn', { active: viewMode === 'source' }]"
          @click="viewMode = 'source'"
        >源码</button>
      </div>
      <span v-if="projectStore.currentFileName" class="preview-file-name">
        {{ projectStore.currentFileName }}
      </span>
      <span v-if="selectedLabel && viewMode === 'preview'" class="preview-selected">
        ● {{ selectedLabel }}
      </span>
    </div>
    <iframe
      v-if="viewMode === 'preview'"
      ref="iframeEl"
      class="preview-iframe"
      sandbox="allow-scripts allow-same-origin"
      :srcdoc="previewHtml"
      @load="onIframeLoad"
    />
    <div v-else class="source-view">
      <pre class="source-code">{{ sourceCode }}</pre>
    </div>
  </div>
</template>

<style scoped>
.preview-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.preview-status-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 12px;
  border-bottom: 1px solid #e4e7ed;
  background: #f5f7fa;
  font-size: 13px;
  color: #606266;
  flex-shrink: 0;
}

.mode-toggle {
  display: flex;
  gap: 0;
  border: 1px solid #dcdfe6;
  border-radius: 3px;
  overflow: hidden;
}

.toggle-btn {
  padding: 2px 12px;
  border: none;
  background: #fff;
  color: #606266;
  font-size: 12px;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s;
}

.toggle-btn:first-child {
  border-right: 1px solid #dcdfe6;
}

.toggle-btn:hover {
  color: #409eff;
}

.toggle-btn.active {
  background: #409eff;
  color: #fff;
}

.preview-file-name {
  font-weight: 500;
  color: #303133;
}

.preview-selected {
  color: #409eff;
}

.preview-iframe {
  flex: 1;
  border: none;
  width: 100%;
  background: #fff;
}

.source-view {
  flex: 1;
  overflow: auto;
  background: #1e1e1e;
  padding: 12px;
}

.source-code {
  margin: 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #d4d4d4;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
