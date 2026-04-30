<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { open } from '@tauri-apps/plugin-dialog'
import { useTemplateStore } from '../stores/template'
import { useDomTreeStore } from '../stores/domTree'
import { useProjectStore } from '../stores/project'
import { useTemplateParser } from '../composables/useTemplateParser'
import type { TemplateConfig, TemplateComponent } from '../stores/template'

const templateStore = useTemplateStore()
const domTreeStore = useDomTreeStore()
const projectStore = useProjectStore()
const { extractComponent, rewriteUrls, htmlToDomNodes } = useTemplateParser()

const hasDir = computed(() => !!templateStore.templateDir)

onMounted(async () => {
  if (templateStore.templateDir) {
    await templateStore.loadTemplates()
  }
})

async function selectTemplateDir() {
  const selected = await open({ directory: true, multiple: false })
  if (selected && typeof selected === 'string') {
    await templateStore.setTemplateDir(selected)
  }
}

function findBody(nodes: any[]): any {
  for (const node of nodes) {
    if (node.tagName?.toLowerCase() === 'body') return node
    if (node.children) {
      const found = findBody(node.children)
      if (found) return found
    }
  }
  return null
}

async function insertComponent(config: TemplateConfig, component: TemplateComponent) {
  try {
    const html = await templateStore.readTemplateFile(config)
    const rawSnippet = extractComponent(html, component.selector)
    if (!rawSnippet) return
    const rewritten = rewriteUrls(rawSnippet, config.baseUrl)
    const nodes = htmlToDomNodes(rewritten)

    const selectedId = domTreeStore.selectedNodeId
    if (selectedId) {
      const selectedNode = domTreeStore.findNode(domTreeStore.domTree, selectedId)
      if (selectedNode?.type === 'element') {
        domTreeStore.insertNodes(selectedId, nodes)
      } else {
        const parent = domTreeStore.findParent(domTreeStore.domTree, selectedId)
        domTreeStore.insertNodes(parent?.id ?? null, nodes)
      }
    } else {
      const body = findBody(domTreeStore.domTree)
      if (body) {
        domTreeStore.insertNodes(body.id, nodes)
      }
    }
    projectStore.markDirty()
  } catch (err) {
    console.error('Failed to insert component:', err)
  }
}

async function openTemplate(config: TemplateConfig) {
  const filePath = config.dirPath + '/' + config.file
  await projectStore.loadFile(filePath)
}
</script>

<template>
  <div class="template-panel">
    <div v-if="!hasDir" class="empty-state">
      <p>请配置模板目录</p>
      <el-button size="small" @click="selectTemplateDir">选择目录</el-button>
    </div>
    <div v-else-if="templateStore.templates.length === 0" class="empty-state">
      <p>未找到模板</p>
      <el-button size="small" @click="selectTemplateDir">更换目录</el-button>
    </div>
    <template v-else>
      <div v-for="tpl in templateStore.templates" :key="tpl.dirPath" class="template-group">
        <div class="template-name" @dblclick="openTemplate(tpl)">
          {{ tpl.name }}
        </div>
        <div
          v-for="comp in tpl.components"
          :key="comp.selector"
          class="template-component"
          @click="insertComponent(tpl, comp)"
        >
          <span v-if="comp.icon" class="comp-icon">{{ comp.icon }}</span>
          <span>{{ comp.name }}</span>
        </div>
      </div>
    </template>
    <div v-if="hasDir" class="panel-footer">
      <button class="config-btn" @click="selectTemplateDir">配置模板目录</button>
    </div>
  </div>
</template>

<style scoped>
.template-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0 4px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: #909399;
  font-size: 13px;
  gap: 8px;
}

.template-group {
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 4px;
}

.template-name {
  padding: 6px 4px;
  font-size: 13px;
  font-weight: 500;
  color: #303133;
  cursor: pointer;
  user-select: none;
}

.template-name:hover {
  background: #f5f7fa;
}

.template-component {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 4px 4px 16px;
  font-size: 12px;
  color: #606266;
  cursor: pointer;
  user-select: none;
  border-radius: 3px;
}

.template-component:hover {
  background: #ecf5ff;
  color: #409eff;
}

.comp-icon {
  font-size: 14px;
}

.panel-footer {
  padding: 8px 4px;
  border-top: 1px solid #ebeef5;
  flex-shrink: 0;
}

.config-btn {
  width: 100%;
  padding: 4px 0;
  border: 1px solid #dcdfe6;
  border-radius: 3px;
  background: #fff;
  color: #909399;
  font-size: 12px;
  cursor: pointer;
}

.config-btn:hover {
  color: #409eff;
  border-color: #409eff;
}
</style>
