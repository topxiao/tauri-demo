# Template Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 左侧面板新增"内置模板" tab，展示模板组件列表，支持插入组件片段和打开模板编辑

**Architecture:** 新增 useTemplateParser composable 处理组件提取和 URL 重写，template store 管理状态，TemplatePanel.vue 做展示，修改 LeftPanel 和 domTree store

**Tech Stack:** Vue 3, Pinia, parse5, Tauri API (文件对话框 + 文件读取)

---

### Task 1: 创建 useTemplateParser composable

**Files:**
- Create: `src/composables/useTemplateParser.ts`

- [ ] **Step 1: 创建 useTemplateParser.ts**

```typescript
import { parse, serialize } from 'parse5'
import type { DomNode } from '../types'
import { useHtmlParser } from './useHtmlParser'

function matchSelector(astNode: any, selector: string): boolean {
  if (!astNode.attrs && !astNode.tagName) return false
  if (selector.startsWith('#')) {
    const id = selector.slice(1)
    return astNode.attrs?.some((a: any) => a.name === 'id' && a.value === id)
  }
  if (selector.startsWith('.')) {
    const cls = selector.slice(1)
    return astNode.attrs?.some(
      (a: any) => a.name === 'class' && a.value.split(/\s+/).includes(cls)
    )
  }
  return astNode.tagName === selector.toLowerCase()
}

function findElementBySelector(astNode: any, selector: string): any | null {
  if (astNode.tagName && matchSelector(astNode, selector)) return astNode
  if (astNode.childNodes) {
    for (const child of astNode.childNodes) {
      const found = findElementBySelector(child, selector)
      if (found) return found
    }
  }
  return null
}

function rewriteAttrUrls(attrs: any[], baseUrl: string): any[] {
  return attrs.map((attr: any) => {
    if ((attr.name === 'src' || attr.name === 'href') && attr.value) {
      const val = attr.value
      if (
        !val.startsWith('http') &&
        !val.startsWith('/') &&
        !val.startsWith('data:') &&
        !val.startsWith('#') &&
        !val.startsWith('javascript:')
      ) {
        return { ...attr, value: baseUrl + '/' + val }
      }
    }
    return attr
  })
}

function rewriteAstUrls(astNode: any, baseUrl: string): void {
  if (astNode.attrs) {
    astNode.attrs = rewriteAttrUrls(astNode.attrs, baseUrl)
  }
  if (astNode.childNodes) {
    for (const child of astNode.childNodes) {
      rewriteAstUrls(child, baseUrl)
    }
  }
}

export function useTemplateParser() {
  function extractComponent(html: string, selector: string): string | null {
    const ast = parse(html)
    const element = findElementBySelector(ast, selector)
    if (!element) return null
    return serialize(element)
  }

  function rewriteUrls(html: string, baseUrl: string): string {
    const ast = parse(html)
    rewriteAstUrls(ast, baseUrl)
    return serialize(ast)
  }

  function htmlToDomNodes(html: string, parentId: string | null = null): DomNode[] {
    const { parseToDomTree } = useHtmlParser()
    const nodes = parseToDomTree(html)
    function assignParent(nodes: DomNode[], pid: string | null) {
      for (const node of nodes) {
        node.parentId = pid ?? undefined
        if (node.children) assignParent(node.children, node.id)
      }
    }
    assignParent(nodes, parentId)
    return nodes
  }

  return { extractComponent, rewriteUrls, htmlToDomNodes }
}
```

- [ ] **Step 2: 构建验证**

Run: `npx vite build --mode development`
Expected: 构建成功

---

### Task 2: 创建 template store

**Files:**
- Create: `src/stores/template.ts`

- [ ] **Step 1: 创建 template store**

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'

export interface TemplateComponent {
  name: string
  selector: string
  icon?: string
}

export interface TemplateConfig {
  name: string
  file: string
  baseUrl: string
  dirPath: string
  components: TemplateComponent[]
}

const STORAGE_KEY = 'template-dir'

export const useTemplateStore = defineStore('template', () => {
  const templateDir = ref<string>('')
  const templates = ref<TemplateConfig[]>([])

  function initFromStorage() {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      templateDir.value = stored
    }
  }

  async function setTemplateDir(path: string) {
    templateDir.value = path
    localStorage.setItem(STORAGE_KEY, path)
    await loadTemplates()
  }

  async function loadTemplates() {
    if (!templateDir.value) {
      templates.value = []
      return
    }
    try {
      const entries: string[] = await invoke('read_dir', { path: templateDir.value })
      const configs: TemplateConfig[] = []
      for (const name of entries) {
        const dirPath = templateDir.value + '/' + name
        try {
          const configJson: string = await invoke('read_file', { path: dirPath + '/template.json' })
          const config = JSON.parse(configJson)
          configs.push({ ...config, dirPath })
        } catch {
          // no template.json, skip
        }
      }
      templates.value = configs
    } catch {
      templates.value = []
    }
  }

  async function readTemplateFile(config: TemplateConfig): Promise<string> {
    const filePath = config.dirPath + '/' + config.file
    return invoke('read_file', { path: filePath }) as Promise<string>
  }

  initFromStorage()

  return { templateDir, templates, setTemplateDir, loadTemplates, readTemplateFile }
})
```

- [ ] **Step 2: 确认 Tauri 后端有 read_dir 命令**

Run: `grep -n "read_dir" src-tauri/src/lib.rs`
如果有则跳过，如果没有需要在 lib.rs 中添加 read_dir 命令：

```rust
#[tauri::command]
fn read_dir(path: &str) -> Result<Vec<String>, String> {
    let entries = std::fs::read_dir(path).map_err(|e| e.to_string())?;
    let mut names = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_type = entry.file_type().map_err(|e| e.to_string())?;
        if file_type.is_dir() {
            names.push(entry.file_name().to_string_lossy().to_string());
        }
    }
    Ok(names)
}
```

并在 `main` 的 `.invoke_handler` 中注册: `read_dir`

- [ ] **Step 3: 构建验证**

Run: `npx vite build --mode development`
Expected: 构建成功

---

### Task 3: 修改 domTree store 新增 insertNodes 方法

**Files:**
- Modify: `src/stores/domTree.ts`

- [ ] **Step 1: 添加 insertNodes 方法**

在 domTree.ts 的 return 块之前添加：

```typescript
function insertNodes(parentId: string | null, nodes: DomNode[]) {
  pushSnapshot()
  if (parentId) {
    const parent = findNode(domTree.value, parentId)
    if (!parent) return
    if (!parent.children) parent.children = []
    for (const node of nodes) {
      node.parentId = parentId
      parent.children.push(node)
    }
  } else {
    // Insert at root level
    domTree.value.push(...nodes)
  }
}
```

在 return 中添加 `insertNodes`。

- [ ] **Step 2: 构建验证**

---

### Task 4: 创建 TemplatePanel.vue

**Files:**
- Create: `src/components/TemplatePanel.vue`

- [ ] **Step 1: 创建 TemplatePanel.vue**

```vue
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
      // Insert at body end
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
```

- [ ] **Step 2: 构建验证**

---

### Task 5: 修改 LeftPanel.vue 新增"内置模板" tab

**Files:**
- Modify: `src/components/LeftPanel.vue`

- [ ] **Step 1: 修改 LeftPanel.vue**

添加 TemplatePanel import 和第三个 tab：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import FileExplorer from './FileExplorer.vue'
import DomTree from './DomTree.vue'
import TemplatePanel from './TemplatePanel.vue'

const activeTab = ref<'files' | 'dom' | 'templates'>('files')
</script>

<template>
  <div class="left-panel">
    <div class="left-header">
      <div class="mode-toggle">
        <button
          :class="['toggle-btn', { active: activeTab === 'files' }]"
          @click="activeTab = 'files'"
        >文件</button>
        <button
          :class="['toggle-btn', { active: activeTab === 'dom' }]"
          @click="activeTab = 'dom'"
        >DOM 树</button>
        <button
          :class="['toggle-btn', { active: activeTab === 'templates' }]"
          @click="activeTab = 'templates'"
        >模板</button>
      </div>
    </div>
    <div class="left-content">
      <DomTree v-if="activeTab === 'dom'" />
      <FileExplorer v-else-if="activeTab === 'files'" />
      <TemplatePanel v-else />
    </div>
  </div>
</template>
```

CSS 中 `.toggle-btn:first-child` 的 border-right 样式需要保留（仅第一个按钮右边框）。其余不变。

- [ ] **Step 2: 构建验证**

---

### Task 6: 创建 templateV-3 示例 template.json

**Files:**
- Create: `C:\Users\RaWal\Desktop\templateV-3\template.json`

- [ ] **Step 1: 创建 template.json**

在用户指定的模板目录下创建配置文件：

```json
{
  "name": "登录页模板 V3",
  "file": "index.html",
  "baseUrl": "https://cloud.21tb.com/login/custom/templateV-3",
  "components": [
    { "name": "背景图", "selector": ".elp-login-bg", "icon": "🖼️" },
    { "name": "Logo", "selector": ".logo_box", "icon": "🏷️" },
    { "name": "登录表单", "selector": ".login-form", "icon": "📝" },
    { "name": "国际化组件", "selector": ".login-i18n-div-index", "icon": "🌐" },
    { "name": "注册链接", "selector": ".login-shuoming", "icon": "🔗" },
    { "name": "Copyright", "selector": ".copyright_box", "icon": "©️" },
    { "name": "扫码组件", "selector": ".erwei-box", "icon": "📱" },
    { "name": "轮播图", "selector": ".lunbo", "icon": "🎠" }
  ]
}
```

- [ ] **Step 2: 确认 @tauri-apps/plugin-dialog 已安装**

Run: `grep "@tauri-apps/plugin-dialog" package.json`
如果未安装需要：`npm install @tauri-apps/plugin-dialog`
并在 `src-tauri/Cargo.toml` 的 dependencies 中添加 `tauri-plugin-dialog`
在 `src-tauri/src/lib.rs` 的 plugin builder 中注册 `.plugin(tauri_plugin_dialog::init())`
