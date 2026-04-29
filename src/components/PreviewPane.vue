<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import hljs from 'highlight.js/lib/core'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import freemarkerLang from '../utils/freemarkerLang'
import { useDomTreeStore } from '../stores/domTree'
import { useProjectStore } from '../stores/project'
import { useHtmlParser } from '../composables/useHtmlParser'
import { useIframeSync } from '../composables/useIframeSync'

hljs.registerLanguage('html', xml)
hljs.registerLanguage('ftl', freemarkerLang)
hljs.registerLanguage('css', css)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('json', json)

const domTreeStore = useDomTreeStore()
const projectStore = useProjectStore()
const { domTreeToHtml } = useHtmlParser()
const { setIframeRef, highlight, unhighlight, prepareHtmlForPreview } = useIframeSync()

const iframeEl = ref<HTMLIFrameElement | null>(null)
const previousSelectedId = ref<string | null>(null)
const viewMode = ref<'preview' | 'source'>('preview')

const isHtmlFile = computed(() => {
  const name = projectStore.currentFileName || ''
  return name.endsWith('.html') || name.endsWith('.htm') || name.endsWith('.ftl') || name.endsWith('.ftlh')
})

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
  if (isHtmlFile.value) {
    const tree = domTreeStore.domTree
    if (tree.length === 0) return ''
    return domTreeToHtml(tree)
  }
  return projectStore.currentFileContent || ''
})

const highlightedSource = computed(() => {
  const code = sourceCode.value
  if (!code) return ''
  const fileName = projectStore.currentFileName || ''
  let lang = 'html'
  if (fileName.endsWith('.ftl') || fileName.endsWith('.ftlh')) {
    lang = 'ftl'
  } else if (fileName.endsWith('.css')) {
    lang = 'css'
  } else if (fileName.endsWith('.js')) {
    lang = 'javascript'
  } else if (fileName.endsWith('.json')) {
    lang = 'json'
  }
  try {
    return hljs.highlight(code, { language: lang }).value
  } catch {
    return code
  }
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
      v-if="viewMode === 'preview' && isHtmlFile"
      ref="iframeEl"
      class="preview-iframe"
      sandbox="allow-scripts allow-same-origin"
      :srcdoc="previewHtml"
      @load="onIframeLoad"
    />
    <div v-else-if="viewMode === 'preview' && !isHtmlFile" class="no-preview">
      此文件类型不支持预览，请切换到源码查看
    </div>
    <div v-else class="source-view">
      <pre class="source-code"><code v-html="highlightedSource"></code></pre>
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

.no-preview {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 13px;
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
  white-space: pre-wrap;
  word-wrap: break-word;
}

.source-code :deep(code) {
  font-family: inherit;
  font-size: inherit;
  background: transparent;
  padding: 0;
}

/* highlight.js high-contrast dark theme */
.source-code :deep(code) {
  color: #d4d4d4;
}
.source-code :deep(.hljs-keyword) { color: #ff6b9d; }
.source-code :deep(.hljs-tag) { color: #56d364; }
.source-code :deep(.hljs-name) { color: #7ee787; }
.source-code :deep(.hljs-attr) { color: #79c0ff; }
.source-code :deep(.hljs-string) { color: #a5d6ff; }
.source-code :deep(.hljs-comment) { color: #8b949e; font-style: italic; }
.source-code :deep(.hljs-variable) { color: #ffa657; }
.source-code :deep(.hljs-built_in) { color: #d2a8ff; }
.source-code :deep(.hljs-title) { color: #d2a8ff; }
.source-code :deep(.hljs-number) { color: #79c0ff; }
.source-code :deep(.hljs-selector-class) { color: #7ee787; }
.source-code :deep(.hljs-selector-id) { color: #ffa657; }
.source-code :deep(.hljs-meta) { color: #8b949e; }
.source-code :deep(.hljs-symbol) { color: #ffa657; }
.source-code :deep(.hljs-params) { color: #d4d4d4; }
.source-code :deep(.hljs-property) { color: #79c0ff; }
.source-code :deep(.hljs-punctuation) { color: #c9d1d9; }
.source-code :deep(.hljs-operator) { color: #ff7b72; }
.source-code :deep(.hljs-doctag) { color: #ff7b72; }
.source-code :deep(.hljs-type) { color: #ffa657; }
</style>
