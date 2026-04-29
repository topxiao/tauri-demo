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

/** Selected node description for the status bar */
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

/** Build the HTML to display inside the iframe */
const previewHtml = computed(() => {
  const tree = domTreeStore.domTree
  if (tree.length === 0) return ''
  const rawHtml = domTreeToHtml(tree)
  return prepareHtmlForPreview(rawHtml, tree)
})

/** Handle iframe load: set ref and start listening for messages */
function onIframeLoad() {
  setIframeRef(iframeEl.value)
}

/** Handle postMessage from iframe (element clicks / selection cleared) */
function handleMessage(e: MessageEvent) {
  if (!e.data || !e.data.type) return
  if (e.data.type === 'elementClicked' && e.data.nodeId) {
    domTreeStore.selectNode(e.data.nodeId)
  } else if (e.data.type === 'selectionCleared') {
    domTreeStore.clearSelection()
  }
}

/** Watch selection changes to highlight/unhighlight */
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
      <span v-if="projectStore.currentFileName" class="preview-file-name">
        预览：{{ projectStore.currentFileName }}
      </span>
      <span v-else class="preview-file-name">预览</span>
      <span v-if="selectedLabel" class="preview-selected">
        ● 已选中: {{ selectedLabel }}
      </span>
    </div>
    <iframe
      ref="iframeEl"
      class="preview-iframe"
      sandbox="allow-scripts allow-same-origin"
      :srcdoc="previewHtml"
      @load="onIframeLoad"
    />
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
</style>
