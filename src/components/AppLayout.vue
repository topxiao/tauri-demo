<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { ElMessage } from 'element-plus'
import { useProjectStore } from '../stores/project'
import { useDomTreeStore } from '../stores/domTree'
import { useStyleStateStore } from '../stores/styleState'
import { useHtmlParser } from '../composables/useHtmlParser'
import { useCssEditor } from '../composables/useCssEditor'
import type { DomNode } from '../types'
import LeftPanel from './LeftPanel.vue'
import PreviewPane from './PreviewPane.vue'
import RightPanel from './RightPanel.vue'

const projectStore = useProjectStore()
const domTreeStore = useDomTreeStore()
const styleStateStore = useStyleStateStore()
const { parseToDomTree, domTreeToHtml, extractStyleContent, extractExternalCssPaths } = useHtmlParser()
const { parseStyleTagCss, parseExternalCss, serializeCss } = useCssEditor()

/**
 * Collect all <style> element nodes from the DomNode tree in document order.
 */
function collectStyleElements(nodes: DomNode[]): DomNode[] {
  const result: DomNode[] = []
  function walk(list: DomNode[]) {
    for (const node of list) {
      if (node.type === 'element' && node.tagName === 'style') {
        result.push(node)
      }
      if (node.children) {
        walk(node.children)
      }
    }
  }
  walk(nodes)
  return result
}

function handleKeydown(e: KeyboardEvent) {
  const isCtrl = e.ctrlKey || e.metaKey
  if (!isCtrl) return

  if (e.key === 's') {
    e.preventDefault()
    window.dispatchEvent(new CustomEvent('app-save'))
  } else if (e.key === 'z') {
    e.preventDefault()
    window.dispatchEvent(new CustomEvent('app-undo'))
  } else if (e.key === 'y') {
    e.preventDefault()
    window.dispatchEvent(new CustomEvent('app-redo'))
  }
}

async function saveCurrentFile() {
  const filePath = projectStore.currentFilePath
  if (!filePath) return

  try {
    // Before serializing DOM tree, write updated CSS AST content back into
    // the <style> element text nodes in the DomNode tree.
    const styleTagSources = styleStateStore.cssSources.filter(
      (s) => s.type === 'style-tag',
    )

    if (styleTagSources.length > 0) {
      // Collect all <style> elements from the DomNode tree in document order
      const styleElements = collectStyleElements(domTreeStore.domTree)

      for (const source of styleTagSources) {
        const idx = source.styleTagIndex ?? 0
        const styleEl = styleElements[idx]
        if (!styleEl || !styleEl.children) continue

        const serializedCss = await serializeCss(source.ast)

        // Update the first text child node with the serialized CSS
        const textChild = styleEl.children.find((c: DomNode) => c.type === 'text')
        if (textChild) {
          textChild.textContent = serializedCss
        } else {
          // No text child exists — insert one
          styleEl.children.unshift({
            id: crypto.randomUUID(),
            type: 'text',
            textContent: serializedCss,
            parentId: styleEl.id,
          })
        }
      }
    }

    // Serialize DOM tree to HTML and write
    const html = domTreeToHtml(domTreeStore.domTree)
    await invoke('write_file', { path: filePath, content: html })

    // Serialize dirty external CSS files
    const dirtyFiles = styleStateStore.dirtyCssFiles
    if (dirtyFiles.size > 0) {
      for (const source of styleStateStore.cssSources) {
        if (source.type === 'external' && source.filePath && dirtyFiles.has(source.filePath)) {
          const cssContent = await serializeCss(source.ast)
          await invoke('write_file', { path: source.filePath, content: cssContent })
        }
      }
      styleStateStore.clearDirtyCssFiles()
    }

    projectStore.markClean()
    ElMessage.success('保存成功')
  } catch (err) {
    console.error('Save failed:', err)
    ElMessage.error(`保存失败: ${err}`)
  }
}

function handleUndo() {
  domTreeStore.undo()
  styleStateStore.undoCss()
  projectStore.markDirty()
}

function handleRedo() {
  domTreeStore.redo()
  styleStateStore.redoCss()
  projectStore.markDirty()
}

function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (projectStore.isDirty) {
    e.preventDefault()
  }
}

async function parseAndLoadCss(html: string) {
  const baseDir = projectStore.rootPath || ''
  const styleContents = extractStyleContent(html)
  const externalPaths = extractExternalCssPaths(html, baseDir)

  const sources = []

  // Parse inline style attributes (handled per-element, no global inline source)

  // Parse <style> tag contents
  for (let i = 0; i < styleContents.length; i++) {
    const ast = await parseStyleTagCss(styleContents[i].content)
    sources.push({
      type: 'style-tag' as const,
      ast,
      styleTagIndex: i,
    })
  }

  // Parse external CSS files
  for (const filePath of externalPaths) {
    try {
      const ast = await parseExternalCss(filePath)
      sources.push({
        type: 'external' as const,
        ast,
        filePath,
      })
    } catch {
      console.warn(`Failed to load external CSS: ${filePath}`)
    }
  }

  styleStateStore.setSources(sources)
}

// Watch currentFileContent -> parse DOM tree and CSS sources
watch(() => projectStore.currentFileContent, async (html) => {
  if (!html) return

  const domNodes = parseToDomTree(html)
  domTreeStore.setTree(domNodes)

  await parseAndLoadCss(html)
})

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('app-save', saveCurrentFile)
  window.addEventListener('app-undo', handleUndo)
  window.addEventListener('app-redo', handleRedo)
  window.addEventListener('beforeunload', handleBeforeUnload)

  // Auto-load first HTML file when folder is opened
  if (projectStore.htmlFiles.length > 0 && !projectStore.currentFilePath) {
    await projectStore.loadFile(projectStore.htmlFiles[0].path)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('app-save', saveCurrentFile)
  window.removeEventListener('app-undo', handleUndo)
  window.removeEventListener('app-redo', handleRedo)
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<template>
  <div class="app-layout">
    <header class="top-bar">
      <el-button size="small" @click="projectStore.openFolder()">
        打开文件夹
      </el-button>
      <span class="file-name">
        {{ projectStore.currentFileName }}
        <span v-if="projectStore.isDirty" class="dirty-mark"> *</span>
      </span>
      <el-button
        size="small"
        :disabled="!projectStore.isDirty || !projectStore.currentFilePath"
        @click="saveCurrentFile"
      >
        保存 Ctrl+S
      </el-button>
    </header>
    <div class="main-content">
      <LeftPanel class="left-panel" />
      <div class="center-panel">
        <PreviewPane />
      </div>
      <div class="right-panel">
        <RightPanel />
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.top-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  border-bottom: 1px solid #e4e7ed;
  background: #f5f7fa;
  flex-shrink: 0;
}

.file-name {
  flex: 1;
  font-size: 14px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dirty-mark {
  color: #e6a23c;
  font-weight: bold;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.left-panel {
  width: 280px;
  flex-shrink: 0;
  border-right: 1px solid #e4e7ed;
  overflow-y: auto;
}

.center-panel {
  flex: 1;
  padding: 12px;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.right-panel {
  width: 300px;
  flex-shrink: 0;
  border-left: 1px solid #e4e7ed;
  padding: 12px;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
}
</style>
