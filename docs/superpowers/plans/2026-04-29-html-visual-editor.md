# HTML 可视化编辑器 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个基于 Tauri + Vue 3 的桌面 HTML 可视化编辑器，支持 DOM 树操作、CSS 三来源编辑、iframe 实时预览和文件保存。

**Architecture:** 前端驱动架构。Vue 3 前端负责全部 HTML/CSS 解析和 DOM 操作，Rust 后端仅做文件 I/O。parse5 保真解析/序列化 HTML，css-tree 解析/编辑 CSS AST，iframe srcdoc 做实时预览，postMessage 双向通信同步选中状态。

**Tech Stack:** Tauri v2, Vue 3, TypeScript, Vite, Element Plus, parse5, css-tree, Pinia

---

## 文件结构

```
src/
├── types/
│   └── index.ts                    # DomNode, FileEntry 等类型定义
├── stores/
│   ├── project.ts                  # 文件夹/文件状态
│   ├── domTree.ts                  # DOM 树数据和选中状态
│   └── styleState.ts              # CSS AST 和样式编辑状态
├── composables/
│   ├── useHtmlParser.ts            # parse5 解析/序列化 HTML
│   ├── useCssEditor.ts            # css-tree 解析/编辑 CSS
│   └── useIframeSync.ts           # postMessage 通信
├── utils/
│   ├── nodeId.ts                   # 节点 ID 生成器
│   └── selectorMatcher.ts         # 简单选择器匹配
├── components/
│   ├── AppLayout.vue               # 三栏布局骨架
│   ├── LeftPanel.vue               # 左侧面板（文件/DOM树标签页切换）
│   ├── FileExplorer.vue            # 文件树
│   ├── DomTree.vue                 # DOM 树
│   ├── DomNodeEditor.vue           # 节点编辑弹窗
│   ├── PreviewPane.vue             # iframe 预览
│   ├── RightPanel.vue              # 右侧面板
│   ├── StyleEditor.vue             # 样式编辑器主体
│   └── StylePropertyGroups.vue     # 分组属性面板
├── App.vue
└── main.ts

src-tauri/
└── src/
    └── main.rs                     # Tauri 入口 + 文件 I/O commands
```

---

### [x] Task 1: 项目脚手架搭建

**Capability:** project-management
**Files:**
- Create: `package.json`, `src-tauri/`, `vite.config.ts`, `tsconfig.json`

- [ ] **Step 1: 初始化 Tauri + Vue 3 项目**

```bash
cd d:/Workspace/cusor_workspace/tauri-demo
npm create tauri-app@latest . -- --template vue-ts
```

选择 Vue + TypeScript 模板。初始化完成后确认项目可运行：

```bash
npm install
npm run tauri dev
```

Expected: 应用窗口启动，显示默认 Vue 页面。

- [ ] **Step 2: 安装前端依赖**

```bash
npm install element-plus parse5 css-tree pinia
npm install -D @types/parse5
```

- [ ] **Step 3: 配置 main.ts 注册 Element Plus 和 Pinia**

```typescript
// src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.use(ElementPlus)
app.mount('#app')
```

- [ ] **Step 4: 验证项目运行**

```bash
npm run tauri dev
```

Expected: 应用窗口启动，Element Plus 样式加载成功。

---

### [x] Task 2: 类型定义

**Capability:** dom-tree-editor, project-management
**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: 创建类型定义文件**

```typescript
// src/types/index.ts

export interface DomNode {
  id: string
  type: 'element' | 'text' | 'comment'
  tagName?: string
  attributes?: Record<string, string>
  textContent?: string
  children?: DomNode[]
  parentId?: string
}

export interface FileEntry {
  name: string
  path: string
  isDir: boolean
  children?: FileEntry[]
}

export interface CssSource {
  type: 'inline' | 'style-tag' | 'external'
  ast: any // css-tree AST
  filePath?: string // 仅外部 CSS 有
  styleTagIndex?: number // <style> 标签在 parse5 AST 中的索引
}

export interface MatchedRule {
  selector: string
  declarations: Record<string, string>
  source: CssSource
  location?: string // e.g. "style.css:12"
}

export interface Snapshot {
  domTree: DomNode[]
  cssSources: CssSource[]
}

export type PostMessageType = 'highlight' | 'unhighlight' | 'updateStyles' | 'updateStructure' | 'elementClicked' | 'selectionChanged'

export interface IframeMessage {
  type: PostMessageType
  [key: string]: any
}
```

- [ ] **Step 2: 创建节点 ID 生成器**

```typescript
// src/utils/nodeId.ts
let counter = 0

export function generateNodeId(): string {
  return `node-${Date.now()}-${counter++}`
}

export function resetCounter(): void {
  counter = 0
}
```

---

### [x] Task 3: Rust 文件 I/O Commands

**Capability:** project-management
**Files:**
- Create: `src-tauri/src/main.rs`

- [ ] **Step 1: 实现 Rust Tauri commands**

```rust
// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::Path;
use tauri::api::dialog::FileDialogBuilder;

#[derive(serde::Serialize, serde::Deserialize)]
struct FileEntry {
    name: String,
    path: String,
    is_dir: bool,
    children: Option<Vec<FileEntry>>,
}

fn list_dir_recursive(dir_path: &Path) -> Result<Vec<FileEntry>, String> {
    let mut entries: Vec<FileEntry> = Vec::new();
    let dir = fs::read_dir(dir_path).map_err(|e| e.to_string())?;

    for entry in dir {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        let path_str = path.to_string_lossy().to_string();

        // 跳过隐藏文件和目录
        if name.starts_with('.') {
            continue;
        }

        let is_dir = path.is_dir();
        let children = if is_dir {
            Some(list_dir_recursive(&path)?)
        } else {
            None
        };

        entries.push(FileEntry {
            name,
            path: path_str,
            is_dir,
            children,
        });
    }

    entries.sort_by(|a, b| {
        b.is_dir.cmp(&a.is_dir).then(a.name.cmp(&b.name))
    });

    Ok(entries)
}

#[tauri::command]
fn open_folder(window: tauri::Window) -> Result<Option<String>, String> {
    let (tx, rx) = std::sync::mpsc::channel();
    FileDialogBuilder::new(&window)
        .set_title("选择项目文件夹")
        .pick_folder(move |path| {
            let _ = tx.send(path.map(|p| p.to_string_lossy().to_string()));
        });
    rx.recv().map_err(|e| e.to_string())
}

#[tauri::command]
fn list_files(dir_path: String) -> Result<Vec<FileEntry>, String> {
    let path = Path::new(&dir_path);
    if !path.is_dir() {
        return Err("路径不是有效文件夹".to_string());
    }
    list_dir_recursive(path)
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("读取文件失败: {}", e))
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, &content).map_err(|e| format!("写入文件失败: {}", e))
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![open_folder, list_files, read_file, write_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 2: 检查 src-tauri/Cargo.toml 依赖**

确保 `src-tauri/Cargo.toml` 包含必要的 serde 依赖：

```toml
[dependencies]
tauri = { version = "2", features = ["dialog-open"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

- [ ] **Step 3: 验证 Rust commands 编译通过**

```bash
cd d:/Workspace/cusor_workspace/tauri-demo
npm run tauri dev
```

Expected: 编译通过，应用启动。

---

### [x] Task 4: Pinia Stores

**Capability:** project-management, dom-tree-editor, save-and-serialize
**Files:**
- Create: `src/stores/project.ts`
- Create: `src/stores/domTree.ts`
- Create: `src/stores/styleState.ts`

- [ ] **Step 1: 创建 project store**

```typescript
// src/stores/project.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import type { FileEntry } from '../types'

export const useProjectStore = defineStore('project', () => {
  const rootPath = ref<string>('')
  const fileTree = ref<FileEntry[]>([])
  const currentFilePath = ref<string>('')
  const currentFileContent = ref<string>('')
  const isDirty = ref(false)

  const currentFileName = computed(() => {
    if (!currentFilePath.value) return ''
    return currentFilePath.value.split(/[/\\]/).pop() || ''
  })

  const htmlFiles = computed(() => {
    const result: FileEntry[] = []
    function collect(entries: FileEntry[]) {
      for (const entry of entries) {
        if (entry.isDir && entry.children) {
          collect(entry.children)
        } else if (entry.name.endsWith('.html') || entry.name.endsWith('.htm')) {
          result.push(entry)
        }
      }
    }
    collect(fileTree.value)
    return result
  })

  async function openFolder(): Promise<boolean> {
    try {
      const path = await invoke<string | null>('open_folder')
      if (!path) return false
      rootPath.value = path
      const files = await invoke<FileEntry[]>('list_files', { dirPath: path })
      fileTree.value = files
      return true
    } catch (e) {
      console.error('打开文件夹失败:', e)
      return false
    }
  }

  async function loadFile(filePath: string): Promise<boolean> {
    try {
      const content = await invoke<string>('read_file', { path: filePath })
      currentFilePath.value = filePath
      currentFileContent.value = content
      isDirty.value = false
      return true
    } catch (e) {
      console.error('读取文件失败:', e)
      return false
    }
  }

  function markDirty() {
    isDirty.value = true
  }

  function markClean() {
    isDirty.value = false
  }

  return {
    rootPath, fileTree, currentFilePath, currentFileContent, isDirty,
    currentFileName, htmlFiles,
    openFolder, loadFile, markDirty, markClean
  }
})
```

- [ ] **Step 2: 创建 domTree store**

```typescript
// src/stores/domTree.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DomNode } from '../types'
import { generateNodeId } from '../utils/nodeId'

export const useDomTreeStore = defineStore('domTree', () => {
  const domTree = ref<DomNode[]>([])
  const selectedNodeId = ref<string>('')
  const expandedNodeIds = ref<Set<string>>(new Set())

  function setTree(tree: DomNode[]) {
    domTree.value = tree
    selectedNodeId.value = ''
  }

  function selectNode(nodeId: string) {
    selectedNodeId.value = nodeId
  }

  function clearSelection() {
    selectedNodeId.value = ''
  }

  function toggleExpand(nodeId: string) {
    if (expandedNodeIds.value.has(nodeId)) {
      expandedNodeIds.value.delete(nodeId)
    } else {
      expandedNodeIds.value.add(nodeId)
    }
  }

  function findNode(nodes: DomNode[], id: string): DomNode | null {
    for (const node of nodes) {
      if (node.id === id) return node
      if (node.children) {
        const found = findNode(node.children, id)
        if (found) return found
      }
    }
    return null
  }

  function findParent(nodes: DomNode[], id: string): { parent: DomNode | null; list: DomNode[] } {
    for (const node of nodes) {
      if (node.children) {
        for (const child of node.children) {
          if (child.id === id) return { parent: node, list: node.children! }
        }
        const result = findParent(node.children, id)
        if (result.parent !== null || result.list !== nodes) return result
      }
    }
    return { parent: null, list: nodes }
  }

  function addNode(parentId: string | null, newNode: DomNode, asChild: boolean) {
    if (asChild && parentId) {
      const parent = findNode(domTree.value, parentId)
      if (parent) {
        if (!parent.children) parent.children = []
        parent.children.push(newNode)
        expandedNodeIds.value.add(parentId)
      }
    } else if (parentId) {
      const { list } = findParent(domTree.value, parentId)
      const index = list.findIndex(n => n.id === parentId)
      list.splice(index + 1, 0, newNode)
    }
  }

  function deleteNode(nodeId: string) {
    const { list } = findParent(domTree.value, nodeId)
    const index = list.findIndex(n => n.id === nodeId)
    if (index !== -1) {
      list.splice(index, 1)
      if (selectedNodeId.value === nodeId) {
        selectedNodeId.value = ''
      }
    }
  }

  function updateNodeAttribute(nodeId: string, attrName: string, attrValue: string) {
    const node = findNode(domTree.value, nodeId)
    if (node) {
      if (!node.attributes) node.attributes = {}
      node.attributes[attrName] = attrValue
    }
  }

  function updateNodeText(nodeId: string, text: string) {
    const node = findNode(domTree.value, nodeId)
    if (node) {
      node.textContent = text
    }
  }

  function reorderSibling(nodeId: string, newIndex: number) {
    const { list } = findParent(domTree.value, nodeId)
    const oldIndex = list.findIndex(n => n.id === nodeId)
    if (oldIndex !== -1) {
      const [moved] = list.splice(oldIndex, 1)
      list.splice(newIndex, 0, moved)
    }
  }

  const selectedNode = () => {
    if (!selectedNodeId.value) return null
    return findNode(domTree.value, selectedNodeId.value)
  }

  return {
    domTree, selectedNodeId, expandedNodeIds,
    setTree, selectNode, clearSelection, toggleExpand,
    findNode, findParent, addNode, deleteNode,
    updateNodeAttribute, updateNodeText, reorderSibling,
    selectedNode
  }
})
```

- [ ] **Step 3: 创建 styleState store**

```typescript
// src/stores/styleState.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CssSource, MatchedRule } from '../types'

export const useStyleStateStore = defineStore('styleState', () => {
  const cssSources = ref<CssSource[]>([])
  const activeTab = ref<'inline' | 'style-tag' | 'external'>('inline')
  const matchedRules = ref<MatchedRule[]>([])
  const dirtyCssFiles = ref<Set<string>>(new Set())

  function setSources(sources: CssSource[]) {
    cssSources.value = sources
  }

  function setActiveTab(tab: 'inline' | 'style-tag' | 'external') {
    activeTab.value = tab
  }

  function setMatchedRules(rules: MatchedRule[]) {
    matchedRules.value = rules
  }

  function markCssDirty(filePath: string) {
    dirtyCssFiles.value.add(filePath)
  }

  function clearDirtyCssFiles() {
    dirtyCssFiles.value.clear()
  }

  function getSourcesByType(type: CssSource['type']): CssSource[] {
    return cssSources.value.filter(s => s.type === type)
  }

  return {
    cssSources, activeTab, matchedRules, dirtyCssFiles,
    setSources, setActiveTab, setMatchedRules,
    markCssDirty, clearDirtyCssFiles, getSourcesByType
  }
})
```

---

### [x] Task 5: HTML 解析器 Composable

**Capability:** dom-tree-editor
**Files:**
- Create: `src/composables/useHtmlParser.ts`

- [ ] **Step 1: 实现 useHtmlParser composable**

```typescript
// src/composables/useHtmlParser.ts
import * as parse5 from 'parse5'
import type { DomNode } from '../types'
import { generateNodeId } from '../utils/nodeId'

export function useHtmlParser() {
  function parseToDomTree(html: string): DomNode[] {
    const doc = parse5.parse(html) as parse5.Document
    return convertNode(doc)!.children || []
  }

  function convertNode(node: any): DomNode | null {
    if (!node) return null

    if (node.nodeName === '#document' || node.nodeName === '#document-fragment') {
      const children = (node.childNodes || [])
        .map((c: any) => convertNode(c))
        .filter(Boolean) as DomNode[]
      return { id: generateNodeId(), type: 'element', children }
    }

    if (node.nodeName === '#text') {
      const text = node.value || ''
      if (text.trim() === '' && !text.includes('\n')) return null
      return {
        id: generateNodeId(),
        type: 'text',
        textContent: text,
      }
    }

    if (node.nodeName === '#comment') {
      return {
        id: generateNodeId(),
        type: 'comment',
        textContent: node.data || '',
      }
    }

    // Element node
    const attrs: Record<string, string> = {}
    if (node.attrs) {
      for (const attr of node.attrs) {
        attrs[attr.name] = attr.value
      }
    }

    const children = (node.childNodes || [])
      .map((c: any) => convertNode(c))
      .filter(Boolean) as DomNode[]

    // 设置 parentId
    const domNode: DomNode = {
      id: generateNodeId(),
      type: 'element',
      tagName: node.tagName,
      attributes: attrs,
      children: children.length > 0 ? children : undefined,
    }

    for (const child of children) {
      child.parentId = domNode.id
    }

    return domNode
  }

  function domTreeToHtml(domNodes: DomNode[]): string {
    // 将 DomNode 树转换回 parse5 AST，然后序列化
    const astNodes = domNodes.map(n => domNodeToAst(n))
    const doc = {
      nodeName: '#document',
      childNodes: astNodes,
    }
    return parse5.serialize(doc as any)
  }

  function domNodeToAst(domNode: DomNode): any {
    if (domNode.type === 'text') {
      return { nodeName: '#text', value: domNode.textContent || '' }
    }
    if (domNode.type === 'comment') {
      return { nodeName: '#comment', data: domNode.textContent || '' }
    }

    const attrs = Object.entries(domNode.attributes || {}).map(([name, value]) => ({
      name,
      value,
    }))

    const childNodes = (domNode.children || []).map(c => domNodeToAst(c))

    return {
      nodeName: domNode.tagName || 'div',
      tagName: domNode.tagName || 'div',
      attrs,
      childNodes,
    }
  }

  // 从 parse5 AST 中提取 <style> 标签内容
  function extractStyleContent(html: string): { index: number; content: string }[] {
    const doc = parse5.parse(html) as parse5.Document
    const styles: { index: number; content: string }[] = []
    let styleIndex = 0

    function walk(node: any) {
      if (node.tagName === 'style' && node.childNodes) {
        const textNode = node.childNodes.find((c: any) => c.nodeName === '#text')
        styles.push({
          index: styleIndex,
          content: textNode?.value || '',
        })
        styleIndex++
      }
      if (node.childNodes) {
        for (const child of node.childNodes) {
          walk(child)
        }
      }
    }
    walk(doc)
    return styles
  }

  // 提取 HTML 中引用的外部 CSS 文件路径
  function extractExternalCssPaths(html: string, baseDir: string): string[] {
    const doc = parse5.parse(html) as parse5.Document
    const paths: string[] = []

    function walk(node: any) {
      if (node.tagName === 'link') {
        const rel = node.attrs?.find((a: any) => a.name === 'rel')
        const href = node.attrs?.find((a: any) => a.name === 'href')
        if (rel?.value === 'stylesheet' && href?.value) {
          // 构建绝对路径
          const fullPath = baseDir + '/' + href.value.replace(/^\.\//, '')
          paths.push(fullPath)
        }
      }
      if (node.childNodes) {
        for (const child of node.childNodes) {
          walk(child)
        }
      }
    }
    walk(doc)
    return paths
  }

  return {
    parseToDomTree,
    domTreeToHtml,
    extractStyleContent,
    extractExternalCssPaths,
  }
}
```

---

### [x] Task 6: CSS 编辑器 Composable

**Capability:** css-style-editor
**Files:**
- Create: `src/composables/useCssEditor.ts`
- Create: `src/utils/selectorMatcher.ts`

- [ ] **Step 1: 创建选择器匹配工具**

```typescript
// src/utils/selectorMatcher.ts
import type { DomNode } from '../types'

interface SimpleSelector {
  type: 'class' | 'id' | 'tag'
  value: string
}

export function parseSimpleSelector(selectorText: string): SimpleSelector | null {
  const trimmed = selectorText.trim()
  if (trimmed.startsWith('.')) {
    return { type: 'class', value: trimmed.slice(1) }
  }
  if (trimmed.startsWith('#')) {
    return { type: 'id', value: trimmed.slice(1) }
  }
  // tag selector — 仅小写字母和数字
  if (/^[a-zA-Z][a-zA-Z0-9-]*$/.test(trimmed)) {
    return { type: 'tag', value: trimmed.toLowerCase() }
  }
  return null // 无法解析的复杂选择器
}

export function selectorMatchesElement(selector: SimpleSelector, element: DomNode): boolean {
  if (element.type !== 'element' || !element.tagName) return false

  switch (selector.type) {
    case 'class': {
      const classes = (element.attributes?.class || '').split(/\s+/)
      return classes.includes(selector.value)
    }
    case 'id':
      return element.attributes?.id === selector.value
    case 'tag':
      return element.tagName.toLowerCase() === selector.value
  }
}

export function findMatchingSelectors(element: DomNode, cssAst: any): any[] {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const csstree = require('css-tree')
  const matchingRules: any[] = []

  csstree.walk(cssAst, {
    visit: 'Rule',
    enter(node: any) {
      const selectors = csstree.list(node.prelude, ',')
      for (const selector of selectors) {
        const selectorText = csstree.generate(selector)
        const simple = parseSimpleSelector(selectorText)
        if (simple && selectorMatchesElement(simple, element)) {
          matchingRules.push({
            rule: node,
            selector: selectorText,
          })
        }
      }
    },
  })

  return matchingRules
}
```

- [ ] **Step 2: 实现 useCssEditor composable**

```typescript
// src/composables/useCssEditor.ts
import { invoke } from '@tauri-apps/api/core'
import type { CssSource, DomNode, MatchedRule } from '../types'
import { findMatchingSelectors } from '../utils/selectorMatcher'

// css-tree 动态引入（ESM 兼容）
let csstree: any
async function getCssTree() {
  if (!csstree) {
    csstree = await import('css-tree')
  }
  return csstree
}

export function useCssEditor() {
  async function parseInlineStyles(node: DomNode): Promise<Record<string, string>> {
    const styleStr = node.attributes?.style || ''
    if (!styleStr) return {}
    const result: Record<string, string> = {}
    styleStr.split(';').forEach(part => {
      const [key, ...valueParts] = part.split(':')
      if (key && valueParts.length > 0) {
        result[key.trim()] = valueParts.join(':').trim()
      }
    })
    return result
  }

  function serializeInlineStyles(styles: Record<string, string>): string {
    return Object.entries(styles)
      .filter(([, v]) => v !== '')
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ')
  }

  async function parseStyleTagCss(content: string): Promise<CssSource> {
    const ct = await getCssTree()
    const ast = ct.parse(content)
    return { type: 'style-tag', ast }
  }

  async function parseExternalCss(filePath: string): Promise<CssSource | null> {
    try {
      const content = await invoke<string>('read_file', { path: filePath })
      const ct = await getCssTree()
      const ast = ct.parse(content)
      return { type: 'external', ast, filePath }
    } catch {
      return null
    }
  }

  async function findAllMatches(element: DomNode, sources: CssSource[]): Promise<MatchedRule[]> {
    const ct = await getCssTree()
    const matches: MatchedRule[] = []

    for (const source of sources) {
      const rules = findMatchingSelectors(element, source.ast)

      for (const { rule, selector } of rules) {
        const declarations: Record<string, string> = {}
        ct.walk(rule.block, {
          visit: 'Declaration',
          enter(node: any) {
            declarations[node.property] = ct.generate(node.value)
          },
        })

        matches.push({
          selector,
          declarations,
          source,
          location: source.type === 'external'
            ? `${source.filePath}`
            : source.type === 'style-tag'
              ? '<style>'
              : 'inline',
        })
      }
    }

    return matches
  }

  async function updateDeclaration(cssAst: any, selector: string, property: string, newValue: string) {
    const ct = await getCssTree()
    let found = false

    ct.walk(cssAst, {
      visit: 'Declaration',
      enter(node: any) {
        if (node.property === property && !found) {
          // 找到第一个匹配的 declaration 更新
          const parent = node
          parent.value = ct.parse(newValue, { context: 'value' })
          found = true
        }
      },
    })
  }

  async function addDeclaration(cssAst: any, selector: string, property: string, value: string) {
    const ct = await getCssTree()
    const newDecl = ct.parse(`${property}: ${value}`, { context: 'declaration' })

    ct.walk(cssAst, {
      visit: 'Rule',
      enter(node: any) {
        const selectors = ct.list(node.prelude, ',')
        for (const sel of selectors) {
          const selText = ct.generate(sel)
          if (selText.trim() === selector.trim()) {
            node.block.children.push(newDecl)
            return
          }
        }
      },
    })
  }

  async function removeDeclaration(cssAst: any, selector: string, property: string) {
    const ct = await getCssTree()

    ct.walk(cssAst, {
      visit: 'Rule',
      enter(node: any) {
        const selectors = ct.list(node.prelude, ',')
        for (const sel of selectors) {
          const selText = ct.generate(sel)
          if (selText.trim() === selector.trim()) {
            node.block.children = node.block.children.filter((decl: any) => {
              return decl.property !== property
            })
            return
          }
        }
      },
    })
  }

  async function serializeCss(ast: any): Promise<string> {
    const ct = await getCssTree()
    return ct.generate(ast)
  }

  return {
    parseInlineStyles,
    serializeInlineStyles,
    parseStyleTagCss,
    parseExternalCss,
    findAllMatches,
    updateDeclaration,
    addDeclaration,
    removeDeclaration,
    serializeCss,
  }
}
```

---

### [x] Task 7: Iframe 同步 Composable

**Capability:** live-preview
**Files:**
- Create: `src/composables/useIframeSync.ts`

- [ ] **Step 1: 实现 iframe helper 脚本注入和通信**

```typescript
// src/composables/useIframeSync.ts
import { ref } from 'vue'
import type { DomNode } from '../types'

const IFRAME_HELPER_SCRIPT = `
<script>
(function() {
  let highlightedElement = null;
  let highlightOverlay = null;

  function createOverlay(el) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:absolute;pointer-events:none;border:2px dashed #4a90d9;background:rgba(74,144,217,0.1);z-index:99999;';
    const rect = el.getBoundingClientRect();
    overlay.style.top = (rect.top + window.scrollY) + 'px';
    overlay.style.left = (rect.left + window.scrollX) + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
    document.body.appendChild(overlay);
    return overlay;
  }

  function removeOverlay() {
    if (highlightOverlay) {
      highlightOverlay.remove();
      highlightOverlay = null;
    }
    highlightedElement = null;
  }

  window.addEventListener('message', function(e) {
    const data = e.data;
    if (!data || !data.type) return;

    if (data.type === 'highlight') {
      removeOverlay();
      const el = document.querySelector('[data-node-id="' + data.nodeId + '"]');
      if (el) {
        highlightedElement = el;
        highlightOverlay = createOverlay(el);
      }
    } else if (data.type === 'unhighlight') {
      removeOverlay();
    } else if (data.type === 'updateStructure') {
      // 不做处理，srcdoc 更新时自动刷新
    }
  });

  document.addEventListener('click', function(e) {
    const target = e.target;
    if (target && target.getAttribute && target.getAttribute('data-node-id')) {
      e.preventDefault();
      e.stopPropagation();
      window.parent.postMessage({
        type: 'elementClicked',
        nodeId: target.getAttribute('data-node-id')
      }, '*');
    }
  }, true);
})();
<\/script>
`

export function useIframeSync() {
  const iframeRef = ref<HTMLIFrameElement | null>(null)

  function injectNodeIds(html: string, domNodes: DomNode[]): string {
    // 为每个元素节点注入 data-node-id 属性
    let result = html
    for (const node of domNodes) {
      if (node.type === 'element' && node.tagName && node.id) {
        // 在开始标签中注入 data-node-id
        const tagRegex = new RegExp(`<${node.tagName}([\\s>])`, 'gi')
        result = result.replace(tagRegex, `<${node.tagName} data-node-id="${node.id}"$1`)
        // 只替换第一个匹配
        break
      }
    }
    // 递归处理子节点
    for (const node of domNodes) {
      if (node.children) {
        result = injectNodeIdsIntoHtml(result, node.children)
      }
    }
    return result
  }

  function injectNodeIdsIntoHtml(html: string, nodes: DomNode[]): string {
    let result = html
    for (const node of nodes) {
      if (node.type === 'element' && node.tagName && node.id) {
        const escapedTag = node.tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        // 查找第一个不带 data-node-id 的同名标签并注入
        const regex = new RegExp(`<(${escapedTag})(\\s[^>]*)(?!data-node-id)(>)`, 'i')
        const match = result.match(regex)
        if (match && !match[2].includes('data-node-id')) {
          result = result.replace(regex, `<${match[1]} data-node-id="${node.id}"${match[2]}${match[3]}`)
        }
      }
      if (node.children) {
        result = injectNodeIdsIntoHtml(result, node.children)
      }
    }
    return result
  }

  function prepareHtmlForPreview(html: string, domNodes: DomNode[]): string {
    // 注入 data-node-id
    let prepared = injectNodeIdsIntoHtml(html, domNodes)
    // 注入 helper 脚本（在 </body> 前，如果没有 </body> 就在末尾）
    if (prepared.includes('</body>')) {
      prepared = prepared.replace('</body>', `${IFRAME_HELPER_SCRIPT}</body>`)
    } else {
      prepared += IFRAME_HELPER_SCRIPT
    }
    return prepared
  }

  function highlight(nodeId: string) {
    if (!iframeRef.value?.contentWindow) return
    iframeRef.value.contentWindow.postMessage({ type: 'highlight', nodeId }, '*')
  }

  function unhighlight(nodeId: string) {
    if (!iframeRef.value?.contentWindow) return
    iframeRef.value.contentWindow.postMessage({ type: 'unhighlight', nodeId }, '*')
  }

  function setIframeRef(el: HTMLIFrameElement | null) {
    iframeRef.value = el
  }

  return {
    iframeRef,
    prepareHtmlForPreview,
    highlight,
    unhighlight,
    setIframeRef,
  }
}
```

---

### [x] Task 8: 三栏布局和左侧面板

**Capability:** project-management, dom-tree-editor
**Files:**
- Create: `src/components/AppLayout.vue`
- Create: `src/components/LeftPanel.vue`
- Create: `src/components/FileExplorer.vue`

- [ ] **Step 1: 创建 AppLayout 三栏布局**

```vue
<!-- src/components/AppLayout.vue -->
<template>
  <div class="app-layout">
    <div class="top-bar">
      <el-button size="small" @click="handleOpenFolder">打开文件夹</el-button>
      <span class="file-name">{{ projectStore.currentFileName }}</span>
      <span v-if="projectStore.isDirty" class="dirty-mark">● 未保存</span>
      <el-button size="small" @click="handleSave" :disabled="!projectStore.isDirty">保存 (Ctrl+S)</el-button>
    </div>
    <div class="main-area">
      <LeftPanel class="left-panel" />
      <div class="center-panel">
        <PreviewPane />
      </div>
      <RightPanel class="right-panel" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useProjectStore } from '../stores/project'
import LeftPanel from './LeftPanel.vue'
import PreviewPane from './PreviewPane.vue'
import RightPanel from './RightPanel.vue'

const projectStore = useProjectStore()

async function handleOpenFolder() {
  const success = await projectStore.openFolder()
  if (success && projectStore.htmlFiles.length > 0) {
    // 自动打开第一个 HTML 文件
    await projectStore.loadFile(projectStore.htmlFiles[0].path)
  }
}

function handleSave() {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }))
}

function handleKeydown(e: KeyboardEvent) {
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault()
    window.dispatchEvent(new CustomEvent('app-save'))
  }
  if (e.ctrlKey && e.key === 'z') {
    window.dispatchEvent(new CustomEvent('app-undo'))
  }
  if (e.ctrlKey && e.key === 'y') {
    window.dispatchEvent(new CustomEvent('app-redo'))
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

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
  border-bottom: 1px solid #e0e0e0;
  background: #f8f8f8;
}
.file-name { font-size: 13px; color: #333; }
.dirty-mark { font-size: 11px; color: #e6a23c; }
.main-area {
  display: flex;
  flex: 1;
  overflow: hidden;
}
.left-panel { width: 280px; min-width: 240px; border-right: 1px solid #e0e0e0; }
.center-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.right-panel { width: 300px; min-width: 260px; border-left: 1px solid #e0e0e0; }
</style>
```

- [ ] **Step 2: 更新 App.vue 使用 AppLayout**

```vue
<!-- src/App.vue -->
<template>
  <AppLayout />
</template>

<script setup lang="ts">
import AppLayout from './components/AppLayout.vue'
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
</style>
```

- [ ] **Step 3: 创建 LeftPanel（文件/DOM树标签页切换）**

```vue
<!-- src/components/LeftPanel.vue -->
<template>
  <div class="left-panel">
    <el-tabs v-model="activeTab">
      <el-tab-pane label="文件" name="files">
        <FileExplorer />
      </el-tab-pane>
      <el-tab-pane label="DOM 树" name="dom">
        <DomTree />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FileExplorer from './FileExplorer.vue'
import DomTree from './DomTree.vue'

const activeTab = ref('files')
</script>

<style scoped>
.left-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.left-panel :deep(.el-tabs) {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.left-panel :deep(.el-tabs__content) {
  flex: 1;
  overflow: auto;
}
</style>
```

- [ ] **Step 4: 创建 FileExplorer**

```vue
<!-- src/components/FileExplorer.vue -->
<template>
  <div class="file-explorer">
    <div v-if="!projectStore.rootPath" class="empty-state">
      <el-button @click="handleOpen">打开文件夹</el-button>
    </div>
    <el-tree
      v-else
      :data="projectStore.fileTree"
      :props="{ children: 'children', label: 'name' }"
      default-expand-all
      @node-click="handleFileClick"
    >
      <template #default="{ data }">
        <span :class="{ 'file-item': true, 'is-html': isHtmlFile(data), 'is-dir': data.isDir, 'is-current': data.path === projectStore.currentFilePath }">
          <span v-if="data.isDir">📁</span>
          <span v-else>{{ isHtmlFile(data) ? '📄' : '📃' }}</span>
          {{ data.name }}
        </span>
      </template>
    </el-tree>
  </div>
</template>

<script setup lang="ts">
import { useProjectStore } from '../stores/project'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FileEntry } from '../types'

const projectStore = useProjectStore()

function isHtmlFile(data: FileEntry): boolean {
  return !data.isDir && (data.name.endsWith('.html') || data.name.endsWith('.htm'))
}

async function handleOpen() {
  await projectStore.openFolder()
}

async function handleFileClick(data: FileEntry) {
  if (data.isDir || !isHtmlFile(data)) return
  if (projectStore.isDirty) {
    try {
      await ElMessageBox.confirm('当前文件有未保存变更，是否保存？', '提示', {
        confirmButtonText: '保存',
        cancelButtonText: '不保存',
        distinguishCancelAndClose: true,
      })
      window.dispatchEvent(new CustomEvent('app-save'))
    } catch (action) {
      if (action === 'cancel') return
    }
  }
  await projectStore.loadFile(data.path)
}
</script>

<style scoped>
.file-explorer { padding: 8px; }
.empty-state { display: flex; justify-content: center; padding: 20px; }
.file-item { font-size: 13px; }
.file-item:not(.is-html):not(.is-dir) { color: #aaa; }
.is-current { color: #409eff; font-weight: 600; }
</style>
```

---

### [x] Task 9: DOM 树组件

**Capability:** dom-tree-editor
**Files:**
- Create: `src/components/DomTree.vue`
- Create: `src/components/DomNodeEditor.vue`

- [ ] **Step 1: 创建 DomNodeEditor 弹窗**

```vue
<!-- src/components/DomNodeEditor.vue -->
<template>
  <el-dialog v-model="visible" :title="isEdit ? '编辑节点' : '添加节点'" width="480px">
    <el-form label-width="80px">
      <el-form-item label="标签类型" v-if="!isTextNode">
        <el-select v-model="form.tagName" filterable allow-create>
          <el-option v-for="tag in commonTags" :key="tag" :label="tag" :value="tag" />
        </el-select>
      </el-form-item>
      <el-form-item label="文本内容" v-if="isTextNode || form.tagName === ''">
        <el-input v-model="form.textContent" type="textarea" :rows="3" />
      </el-form-item>
      <el-form-item label="属性" v-if="!isTextNode">
        <div v-for="(attr, index) in form.attributes" :key="index" class="attr-row">
          <el-input v-model="attr.key" placeholder="属性名" style="width: 40%" />
          <el-input v-model="attr.value" placeholder="属性值" style="width: 45%" />
          <el-button size="small" @click="form.attributes.splice(index, 1)">✕</el-button>
        </div>
        <el-button size="small" @click="form.attributes.push({ key: '', value: '' })">+ 添加属性</el-button>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleConfirm">确认</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import type { DomNode } from '../types'
import { generateNodeId } from '../utils/nodeId'

const visible = ref(false)
const isEdit = ref(false)
const editNodeId = ref('')

const form = reactive({
  tagName: 'div',
  textContent: '',
  attributes: [] as { key: string; value: string }[],
})

const commonTags = ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img', 'ul', 'ol', 'li', 'section', 'article', 'header', 'footer', 'nav', 'main', 'aside', 'table', 'tr', 'td', 'th', 'form', 'input', 'button', 'label', 'textarea', 'select', 'option']

const isTextNode = computed(() => form.tagName === '#text')

function openForAdd() {
  isEdit.value = false
  form.tagName = 'div'
  form.textContent = ''
  form.attributes = [{ key: '', value: '' }]
  visible.value = true
}

function openForEdit(node: DomNode) {
  isEdit.value = true
  editNodeId.value = node.id
  if (node.type === 'text') {
    form.tagName = '#text'
    form.textContent = node.textContent || ''
    form.attributes = []
  } else {
    form.tagName = node.tagName || 'div'
    form.textContent = ''
    form.attributes = Object.entries(node.attributes || {}).map(([key, value]) => ({ key, value }))
  }
  visible.value = true
}

function handleConfirm() {
  const node: DomNode = {
    id: isEdit.value ? editNodeId.value : generateNodeId(),
    type: form.tagName === '#text' ? 'text' : 'element',
    tagName: form.tagName === '#text' ? undefined : form.tagName,
    textContent: form.tagName === '#text' ? form.textContent : undefined,
    attributes: {},
  }
  if (node.type === 'element') {
    for (const attr of form.attributes) {
      if (attr.key) {
        node.attributes![attr.key] = attr.value
      }
    }
  }
  emit('confirm', node, isEdit.value)
  visible.value = false
}

const emit = defineEmits<{
  confirm: [node: DomNode, isEdit: boolean]
}>()

function openAddChild() {
  isEdit.value = false
  form.tagName = 'div'
  form.textContent = ''
  form.attributes = [{ key: '', value: '' }]
  visible.value = true
}

defineExpose({ openForAdd, openForEdit, openAddChild })
</script>

<style scoped>
.attr-row {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
  align-items: center;
}
</style>
```

- [ ] **Step 2: 创建 DomTree 组件**

```vue
<!-- src/components/DomTree.vue -->
<template>
  <div class="dom-tree">
    <div class="toolbar" v-if="domTreeStore.domTree.length > 0">
      <el-button size="small" @click="handleAddSibling">+ 添加</el-button>
      <el-button size="small" type="danger" @click="handleDelete" :disabled="!domTreeStore.selectedNodeId">删除</el-button>
    </div>
    <div class="tree-content" v-if="domTreeStore.domTree.length > 0">
      <el-tree
        :data="domTreeStore.domTree"
        :props="treeProps"
        node-key="id"
        draggable
        :allow-drop="allowDrop"
        @node-click="handleNodeClick"
        @node-contextmenu="handleContextMenu"
        @node-drag-end="handleDragEnd"
        default-expand-all
      >
        <template #default="{ data }">
          <span
            class="tree-node"
            :class="{ selected: data.id === domTreeStore.selectedNodeId }"
            @dblclick="handleDblClick(data)"
          >
            <template v-if="data.type === 'text'">
              <span class="text-node">"{{ truncate(data.textContent, 40) }}"</span>
            </template>
            <template v-else-if="data.type === 'comment'">
              <span class="comment-node">&lt;!-- {{ truncate(data.textContent, 30) }} --&gt;</span>
            </template>
            <template v-else>
              <span class="element-node">&lt;{{ data.tagName }}<span v-if="data.attributes?.class" class="attr-class">.{{ data.attributes.class.split(' ').join('.') }}</span><span v-if="data.attributes?.id" class="attr-id">#{{ data.attributes.id }}</span>&gt;</span>
            </template>
          </span>
        </template>
      </el-tree>
    </div>
    <div v-else class="empty-state">
      <span>请先打开 HTML 文件</span>
    </div>

    <teleport to="body">
      <ul v-show="contextMenu.visible" class="context-menu" :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }">
        <li @click="handleContextAction('addChild')">添加子节点</li>
        <li @click="handleContextAction('edit')">编辑属性</li>
        <li @click="handleContextAction('copy')">复制</li>
        <li @click="handleContextAction('delete')" class="danger">删除</li>
      </ul>
    </teleport>

    <DomNodeEditor ref="nodeEditorRef" @confirm="handleNodeEditorConfirm" />

    <!-- 文本编辑输入框 -->
    <input
      v-show="editingTextNode.show"
      class="text-edit-input"
      :style="{ top: editingTextNode.y + 'px', left: editingTextNode.x + 'px' }"
      v-model="editingTextNode.value"
      @keydown.enter="commitTextEdit"
      @keydown.escape="cancelTextEdit"
      @blur="commitTextEdit"
      ref="textInputRef"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, nextTick } from 'vue'
import { useDomTreeStore } from '../stores/domTree'
import { useProjectStore } from '../stores/project'
import DomNodeEditor from './DomNodeEditor.vue'
import type { DomNode } from '../types'
import { generateNodeId } from '../utils/nodeId'

const domTreeStore = useDomTreeStore()
const projectStore = useProjectStore()
const nodeEditorRef = ref()
const textInputRef = ref<HTMLInputElement>()

const treeProps = {
  children: 'children',
  label: 'tagName',
}

const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  nodeId: '',
})

const editingTextNode = reactive({
  show: false,
  nodeId: '',
  value: '',
  x: 0,
  y: 0,
})

let copiedNode: DomNode | null = null

function truncate(str: string | undefined, len: number): string {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '...' : str
}

function handleNodeClick(data: DomNode) {
  domTreeStore.selectNode(data.id)
}

function handleDblClick(data: DomNode) {
  if (data.type === 'text') {
    editingTextNode.nodeId = data.id
    editingTextNode.value = data.textContent || ''
    editingTextNode.show = true
    // 简单定位
    const el = (event as MouseEvent)?.target as HTMLElement
    if (el) {
      const rect = el.getBoundingClientRect()
      editingTextNode.x = rect.left
      editingTextNode.y = rect.top
    }
    nextTick(() => textInputRef.value?.focus())
  } else if (data.type === 'element') {
    nodeEditorRef.value?.openForEdit(data)
  }
}

function commitTextEdit() {
  if (editingTextNode.nodeId) {
    domTreeStore.updateNodeText(editingTextNode.nodeId, editingTextNode.value)
    projectStore.markDirty()
  }
  editingTextNode.show = false
}

function cancelTextEdit() {
  editingTextNode.show = false
}

function handleContextMenu(e: MouseEvent, data: DomNode) {
  e.preventDefault()
  domTreeStore.selectNode(data.id)
  contextMenu.x = e.clientX
  contextMenu.y = e.clientY
  contextMenu.nodeId = data.id
  contextMenu.visible = true
}

function hideContextMenu() {
  contextMenu.visible = false
}

// 点击其他区域关闭右键菜单
if (typeof window !== 'undefined') {
  window.addEventListener('click', hideContextMenu)
}

function handleContextAction(action: string) {
  hideContextMenu()
  const node = domTreeStore.findNode(domTreeStore.domTree, contextMenu.nodeId)
  if (!node) return

  switch (action) {
    case 'addChild':
      nodeEditorRef.value?.openAddChild()
      break
    case 'edit':
      nodeEditorRef.value?.openForEdit(node)
      break
    case 'copy':
      copiedNode = JSON.parse(JSON.stringify(node))
      break
    case 'delete':
      domTreeStore.deleteNode(contextMenu.nodeId)
      projectStore.markDirty()
      break
  }
}

function handleAddSibling() {
  if (domTreeStore.selectedNodeId) {
    nodeEditorRef.value?.openForAdd()
  }
}

function handleDelete() {
  if (domTreeStore.selectedNodeId) {
    domTreeStore.deleteNode(domTreeStore.selectedNodeId)
    projectStore.markDirty()
  }
}

function handleNodeEditorConfirm(node: DomNode, isEdit: boolean) {
  if (isEdit) {
    // 更新已有节点
    const existing = domTreeStore.findNode(domTreeStore.domTree, node.id)
    if (existing) {
      existing.tagName = node.tagName
      existing.attributes = node.attributes
      existing.textContent = node.textContent
    }
  } else {
    // 添加新节点
    const newNode: DomNode = {
      ...node,
      id: generateNodeId(),
    }
    // 判断是右键菜单的添加子节点还是工具栏添加同级
    domTreeStore.addNode(domTreeStore.selectedNodeId, newNode, contextMenu.nodeId ? true : false)
  }
  projectStore.markDirty()
}

function allowDrop(draggingNode: any, dropNode: any, type: string): boolean {
  // 只允许同级拖拽
  if (type === 'inner') return false
  return draggingNode.parent?.id === dropNode.parent?.id
}

function handleDragEnd(draggingNode: any, dropNode: any, dropType: string) {
  if (dropType !== 'inner') {
    projectStore.markDirty()
  }
}
</script>

<style scoped>
.dom-tree { height: 100%; display: flex; flex-direction: column; }
.toolbar { padding: 6px 8px; border-bottom: 1px solid #eee; display: flex; gap: 6px; }
.tree-content { flex: 1; overflow: auto; padding: 4px; }
.empty-state { display: flex; justify-content: center; align-items: center; height: 100%; color: #999; font-size: 13px; }
.tree-node { font-size: 12px; font-family: monospace; }
.tree-node.selected { background: #e8f0fe; padding: 1px 4px; border-radius: 3px; }
.text-node { color: #6a8759; }
.comment-node { color: #808080; }
.element-node { color: #cc7832; }
.attr-class { color: #ffc66d; }
.attr-id { color: #a9b7c6; }
.context-menu {
  position: fixed; z-index: 9999; background: #fff; border: 1px solid #ddd;
  border-radius: 4px; padding: 4px 0; list-style: none; box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
.context-menu li { padding: 6px 16px; cursor: pointer; font-size: 13px; }
.context-menu li:hover { background: #f0f7ff; }
.context-menu li.danger { color: #f56c6c; }
.text-edit-input {
  position: fixed; z-index: 9999; padding: 4px 8px; border: 2px solid #4a90d9;
  border-radius: 4px; font-size: 12px; font-family: monospace; min-width: 200px;
}
</style>
```

---

### [x] Task 10: iframe 预览面板

**Capability:** live-preview
**Files:**
- Create: `src/components/PreviewPane.vue`

- [ ] **Step 1: 创建 PreviewPane 组件**

```vue
<!-- src/components/PreviewPane.vue -->
<template>
  <div class="preview-pane">
    <div class="status-bar">
      <span class="preview-label">预览：</span>
      <span class="file-name">{{ projectStore.currentFileName || '未打开文件' }}</span>
      <span v-if="selectedInfo" class="selected-info">● 已选中: {{ selectedInfo }}</span>
    </div>
    <div class="iframe-container">
      <iframe
        ref="iframeEl"
        sandbox="allow-scripts allow-same-origin"
        :srcdoc="previewHtml"
        @load="onIframeLoad"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useProjectStore } from '../stores/project'
import { useDomTreeStore } from '../stores/domTree'
import { useIframeSync } from '../composables/useIframeSync'
import { useHtmlParser } from '../composables/useHtmlParser'

const projectStore = useProjectStore()
const domTreeStore = useDomTreeStore()
const { prepareHtmlForPreview, highlight, unhighlight, setIframeRef } = useIframeSync()
const { domTreeToHtml } = useHtmlParser()

const iframeEl = ref<HTMLIFrameElement | null>(null)

const selectedInfo = computed(() => {
  const node = domTreeStore.selectedNode()
  if (!node || node.type !== 'element') return ''
  let info = `<${node.tagName}`
  if (node.attributes?.class) info += `.${node.attributes.class.split(' ').join('.')}`
  if (node.attributes?.id) info += `#${node.attributes.id}`
  info += '>'
  return info
})

const previewHtml = computed(() => {
  if (!projectStore.currentFileContent || domTreeStore.domTree.length === 0) return ''
  const html = domTreeToHtml(domTreeStore.domTree)
  return prepareHtmlForPreview(html, domTreeStore.domTree)
})

// 选中节点变化时更新 iframe 高亮
watch(() => domTreeStore.selectedNodeId, (newId, oldId) => {
  if (oldId) unhighlight(oldId)
  if (newId) highlight(newId)
})

function onIframeLoad() {
  setIframeRef(iframeEl.value)
  // 监听 iframe 的 postMessage
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'elementClicked' && e.data.nodeId) {
      domTreeStore.selectNode(e.data.nodeId)
    }
  })
}
</script>

<style scoped>
.preview-pane { display: flex; flex-direction: column; height: 100%; }
.status-bar {
  display: flex; align-items: center; gap: 8px; padding: 6px 12px;
  border-bottom: 1px solid #e0e0e0; background: #f8f8f8; font-size: 12px;
}
.preview-label { color: #888; }
.file-name { color: #333; }
.selected-info { color: #409eff; margin-left: auto; }
.iframe-container { flex: 1; overflow: hidden; }
.iframe-container iframe { width: 100%; height: 100%; border: none; }
</style>
```

---

### [x] Task 11: 样式编辑器

**Capability:** css-style-editor
**Files:**
- Create: `src/components/RightPanel.vue`
- Create: `src/components/StyleEditor.vue`
- Create: `src/components/StylePropertyGroups.vue`

- [ ] **Step 1: 创建 RightPanel**

```vue
<!-- src/components/RightPanel.vue -->
<template>
  <div class="right-panel">
    <StyleEditor />
  </div>
</template>

<script setup lang="ts">
import StyleEditor from './StyleEditor.vue'
</script>

<style scoped>
.right-panel { height: 100%; overflow: auto; }
</style>
```

- [ ] **Step 2: 创建 StyleEditor**

```vue
<!-- src/components/StyleEditor.vue -->
<template>
  <div class="style-editor">
    <template v-if="selectedElement">
      <div class="element-info">
        <span class="element-tag">&lt;{{ selectedElement.tagName }}</span>
        <span v-if="selectedElement.attributes?.class" class="element-class">.{{ selectedElement.attributes.class }}</span>
        <span v-if="selectedElement.attributes?.id" class="element-id">#{{ selectedElement.attributes.id }}</span>
        <span class="element-tag">&gt;</span>
      </div>

      <el-tabs v-model="styleState.activeTab" class="source-tabs">
        <el-tab-pane name="inline">
          <template #label>
            内联样式 <el-badge :value="inlineRuleCount" :type="inlineRuleCount > 0 ? 'primary' : 'info'" />
          </template>
        </el-tab-pane>
        <el-tab-pane name="style-tag">
          <template #label>
            &lt;style&gt; <el-badge :value="styleTagRuleCount" :type="styleTagRuleCount > 0 ? 'primary' : 'info'" />
          </template>
        </el-tab-pane>
        <el-tab-pane name="external">
          <template #label>
            外部CSS <el-badge :value="externalRuleCount" :type="externalRuleCount > 0 ? 'primary' : 'info'" />
          </template>
        </el-tab-pane>
      </el-tabs>

      <div class="rules-list">
        <div v-for="rule in currentTabRules" :key="rule.selector" class="rule-card">
          <div class="rule-header">
            <span class="rule-selector">{{ rule.selector }}</span>
            <span class="rule-location">{{ rule.location }}</span>
          </div>
          <div class="rule-props">
            <div v-for="(value, prop) in rule.declarations" :key="prop" class="prop-row">
              <span class="prop-name">{{ prop }}</span>
              <el-input
                size="small"
                :model-value="value"
                @change="(val: string) => handlePropertyChange(rule, prop, val)"
              />
            </div>
          </div>
        </div>
        <div v-if="currentTabRules.length === 0" class="no-rules">
          该来源暂无匹配的 CSS 规则
        </div>
      </div>

      <el-divider />

      <StylePropertyGroups :element="selectedElement" />
    </template>
    <div v-else class="empty-state">
      请在 DOM 树中选择一个元素
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useDomTreeStore } from '../stores/domTree'
import { useStyleStateStore } from '../stores/styleState'
import { useProjectStore } from '../stores/project'
import { useCssEditor } from '../composables/useCssEditor'
import { useHtmlParser } from '../composables/useHtmlParser'
import StylePropertyGroups from './StylePropertyGroups.vue'
import type { DomNode, MatchedRule } from '../types'

const domTreeStore = useDomTreeStore()
const styleState = useStyleStateStore()
const projectStore = useProjectStore()
const cssEditor = useCssEditor()
const htmlParser = useHtmlParser()

const selectedElement = computed(() => {
  const node = domTreeStore.selectedNode()
  return node?.type === 'element' ? node : null
})

// 当选中节点变化时，重新计算匹配的 CSS 规则
watch(selectedElement, async (el) => {
  if (!el) {
    styleState.setMatchedRules([])
    return
  }
  const rules = await cssEditor.findAllMatches(el, styleState.cssSources)
  styleState.setMatchedRules(rules)
}, { immediate: true })

const inlineRuleCount = computed(() => styleState.matchedRules.filter(r => r.source.type === 'inline').length)
const styleTagRuleCount = computed(() => styleState.matchedRules.filter(r => r.source.type === 'style-tag').length)
const externalRuleCount = computed(() => styleState.matchedRules.filter(r => r.source.type === 'external').length)

const currentTabRules = computed(() => {
  return styleState.matchedRules.filter(r => r.source.type === styleState.activeTab)
})

async function handlePropertyChange(rule: MatchedRule, property: string, newValue: string) {
  await cssEditor.updateDeclaration(rule.source.ast, rule.selector, property, newValue)
  projectStore.markDirty()
  // 重新计算匹配规则
  if (selectedElement.value) {
    const rules = await cssEditor.findAllMatches(selectedElement.value, styleState.cssSources)
    styleState.setMatchedRules(rules)
  }
}
</script>

<style scoped>
.style-editor { padding: 8px; font-size: 13px; }
.element-info { padding: 8px; background: #f8f8f8; border-radius: 4px; margin-bottom: 8px; font-family: monospace; }
.element-tag { color: #cc7832; }
.element-class { color: #ffc66d; }
.element-id { color: #a9b7c6; }
.source-tabs { margin-bottom: 8px; }
.rule-card { border: 1px solid #e0e0e0; border-radius: 4px; margin-bottom: 8px; overflow: hidden; }
.rule-header { padding: 4px 8px; background: #f0f7ff; display: flex; justify-content: space-between; font-size: 12px; }
.rule-selector { font-family: monospace; color: #4a90d9; font-weight: 600; }
.rule-location { color: #888; font-size: 10px; }
.rule-props { padding: 4px 8px; }
.prop-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.prop-name { font-family: monospace; color: #6a8759; font-size: 12px; min-width: 100px; }
.no-rules { text-align: center; color: #999; padding: 16px; font-size: 12px; }
.empty-state { display: flex; justify-content: center; align-items: center; height: 100%; color: #999; }
</style>
```

- [ ] **Step 3: 创建 StylePropertyGroups 分组面板**

```vue
<!-- src/components/StylePropertyGroups.vue -->
<template>
  <div class="property-groups">
    <el-collapse>
      <el-collapse-item title="📐 布局" name="layout">
        <div class="prop-grid">
          <div class="prop-field">
            <label>display</label>
            <el-select size="small" v-model="props.display" @change="v => emitChange('display', v)">
              <el-option v-for="v in ['block', 'inline', 'inline-block', 'flex', 'grid', 'none']" :key="v" :label="v" :value="v" />
            </el-select>
          </div>
          <div class="prop-field">
            <label>position</label>
            <el-select size="small" v-model="props.position" @change="v => emitChange('position', v)">
              <el-option v-for="v in ['static', 'relative', 'absolute', 'fixed', 'sticky']" :key="v" :label="v" :value="v" />
            </el-select>
          </div>
          <div class="prop-field">
            <label>width</label>
            <el-input size="small" v-model="props.width" @change="v => emitChange('width', v)" />
          </div>
          <div class="prop-field">
            <label>height</label>
            <el-input size="small" v-model="props.height" @change="v => emitChange('height', v)" />
          </div>
        </div>
      </el-collapse-item>

      <el-collapse-item title="🔄 Flexbox" name="flex" v-if="props.display === 'flex'">
        <div class="prop-grid">
          <div class="prop-field">
            <label>flex-direction</label>
            <el-select size="small" v-model="props.flexDirection" @change="v => emitChange('flex-direction', v)">
              <el-option v-for="v in ['row', 'column', 'row-reverse', 'column-reverse']" :key="v" :label="v" :value="v" />
            </el-select>
          </div>
          <div class="prop-field">
            <label>justify-content</label>
            <el-select size="small" v-model="props.justifyContent" @change="v => emitChange('justify-content', v)">
              <el-option v-for="v in ['flex-start', 'center', 'flex-end', 'space-between', 'space-around']" :key="v" :label="v" :value="v" />
            </el-select>
          </div>
          <div class="prop-field">
            <label>align-items</label>
            <el-select size="small" v-model="props.alignItems" @change="v => emitChange('align-items', v)">
              <el-option v-for="v in ['stretch', 'flex-start', 'center', 'flex-end', 'baseline']" :key="v" :label="v" :value="v" />
            </el-select>
          </div>
        </div>
      </el-collapse-item>

      <el-collapse-item title="↔️ 间距" name="spacing">
        <div class="prop-grid">
          <div class="prop-field">
            <label>margin</label>
            <el-input size="small" v-model="props.margin" @change="v => emitChange('margin', v)" />
          </div>
          <div class="prop-field">
            <label>padding</label>
            <el-input size="small" v-model="props.padding" @change="v => emitChange('padding', v)" />
          </div>
        </div>
        <div class="box-model">
          <div class="box-margin">
            <span>margin</span>
            <div class="box-padding">
              <span>padding</span>
              <div class="box-content">内容</div>
            </div>
          </div>
        </div>
      </el-collapse-item>

      <el-collapse-item title="🔤 排版" name="typography">
        <div class="prop-grid">
          <div class="prop-field full">
            <label>font-family</label>
            <el-input size="small" v-model="props.fontFamily" @change="v => emitChange('font-family', v)" />
          </div>
          <div class="prop-field">
            <label>font-size</label>
            <el-input size="small" v-model="props.fontSize" @change="v => emitChange('font-size', v)" />
          </div>
          <div class="prop-field">
            <label>font-weight</label>
            <el-select size="small" v-model="props.fontWeight" @change="v => emitChange('font-weight', v)">
              <el-option v-for="v in ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900']" :key="v" :label="v" :value="v" />
            </el-select>
          </div>
          <div class="prop-field">
            <label>line-height</label>
            <el-input size="small" v-model="props.lineHeight" @change="v => emitChange('line-height', v)" />
          </div>
          <div class="prop-field">
            <label>text-align</label>
            <el-select size="small" v-model="props.textAlign" @change="v => emitChange('text-align', v)">
              <el-option v-for="v in ['left', 'center', 'right', 'justify']" :key="v" :label="v" :value="v" />
            </el-select>
          </div>
          <div class="prop-field">
            <label>color</label>
            <div class="color-field">
              <el-color-picker size="small" v-model="props.color" @change="v => emitChange('color', v)" />
              <el-input size="small" v-model="props.color" @change="v => emitChange('color', v)" />
            </div>
          </div>
        </div>
      </el-collapse-item>

      <el-collapse-item title="🎨 背景" name="background">
        <div class="prop-field">
          <label>background-color</label>
          <div class="color-field">
            <el-color-picker size="small" v-model="props.backgroundColor" @change="v => emitChange('background-color', v)" />
            <el-input size="small" v-model="props.backgroundColor" @change="v => emitChange('background-color', v)" />
          </div>
        </div>
      </el-collapse-item>

      <el-collapse-item title="🔲 边框" name="border">
        <div class="prop-grid">
          <div class="prop-field">
            <label>border-width</label>
            <el-input size="small" v-model="props.borderWidth" @change="v => emitChange('border-width', v)" />
          </div>
          <div class="prop-field">
            <label>border-style</label>
            <el-select size="small" v-model="props.borderStyle" @change="v => emitChange('border-style', v)">
              <el-option v-for="v in ['none', 'solid', 'dashed', 'dotted', 'double']" :key="v" :label="v" :value="v" />
            </el-select>
          </div>
          <div class="prop-field">
            <label>border-color</label>
            <div class="color-field">
              <el-color-picker size="small" v-model="props.borderColor" @change="v => emitChange('border-color', v)" />
              <el-input size="small" v-model="props.borderColor" @change="v => emitChange('border-color', v)" />
            </div>
          </div>
          <div class="prop-field">
            <label>border-radius</label>
            <el-input size="small" v-model="props.borderRadius" @change="v => emitChange('border-radius', v)" />
          </div>
        </div>
      </el-collapse-item>

      <el-collapse-item title="⚙️ 自定义属性" name="custom">
        <div v-for="(item, idx) in customProps" :key="idx" class="prop-row-custom">
          <el-input size="small" v-model="item.key" placeholder="属性名" />
          <el-input size="small" v-model="item.value" placeholder="属性值" />
          <el-button size="small" @click="customProps.splice(idx, 1)">✕</el-button>
        </div>
        <el-button size="small" @click="customProps.push({ key: '', value: '' })">+ 添加属性</el-button>
        <el-button size="small" type="primary" @click="applyCustomProps" style="margin-left: 8px;">应用</el-button>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { DomNode } from '../types'

const props = defineProps<{ element: DomNode }>()
const emit = defineEmits<{ change: [property: string, value: string] }>()

const styleProps = reactive({
  display: '', position: '', width: '', height: '',
  flexDirection: '', justifyContent: '', alignItems: '',
  margin: '', padding: '',
  fontFamily: '', fontSize: '', fontWeight: '', lineHeight: '', textAlign: '', color: '',
  backgroundColor: '', borderWidth: '', borderStyle: '', borderColor: '', borderRadius: '',
})

const customProps = reactive<{ key: string; value: string }[]>([])

// 当选中元素变化时，从其 style 属性读取当前值
watch(() => props.element, (el) => {
  if (!el?.attributes?.style) {
    Object.keys(styleProps).forEach(k => (styleProps as any)[k] = '')
    return
  }
  const styleStr = el.attributes.style
  const pairs: Record<string, string> = {}
  styleStr.split(';').forEach(part => {
    const [key, ...valueParts] = part.split(':')
    if (key) pairs[key.trim()] = valueParts.join(':').trim()
  })

  styleProps.display = pairs.display || ''
  styleProps.position = pairs.position || ''
  styleProps.width = pairs.width || ''
  styleProps.height = pairs.height || ''
  styleProps.flexDirection = pairs['flex-direction'] || ''
  styleProps.justifyContent = pairs['justify-content'] || ''
  styleProps.alignItems = pairs['align-items'] || ''
  styleProps.margin = pairs.margin || ''
  styleProps.padding = pairs.padding || ''
  styleProps.fontFamily = pairs['font-family'] || ''
  styleProps.fontSize = pairs['font-size'] || ''
  styleProps.fontWeight = pairs['font-weight'] || ''
  styleProps.lineHeight = pairs['line-height'] || ''
  styleProps.textAlign = pairs['text-align'] || ''
  styleProps.color = pairs.color || ''
  styleProps.backgroundColor = pairs['background-color'] || ''
  styleProps.borderWidth = pairs['border-width'] || ''
  styleProps.borderStyle = pairs['border-style'] || ''
  styleProps.borderColor = pairs['border-color'] || ''
  styleProps.borderRadius = pairs['border-radius'] || ''
}, { immediate: true })

function emitChange(property: string, value: string) {
  emit('change', property, value)
}

function applyCustomProps() {
  for (const item of customProps) {
    if (item.key && item.value) {
      emit('change', item.key, item.value)
    }
  }
  customProps.splice(0, customProps.length)
}
</script>

<style scoped>
.property-groups { padding: 0; }
.prop-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.prop-field { display: flex; flex-direction: column; gap: 2px; }
.prop-field.full { grid-column: 1 / -1; }
.prop-field label { font-size: 10px; color: #888; }
.color-field { display: flex; gap: 4px; align-items: center; }
.color-field .el-input { flex: 1; }
.box-model { margin-top: 8px; }
.box-margin {
  background: #fff3cd; border: 2px dashed #ffc107; padding: 12px; text-align: center;
  font-size: 10px; color: #856404;
}
.box-padding {
  background: #d4edda; border: 2px dashed #28a745; padding: 8px; margin-top: 4px;
  font-size: 10px; color: #155724;
}
.box-content {
  background: #cce5ff; border: 1px solid #007bff; padding: 4px; margin-top: 4px;
  font-size: 10px; color: #004085;
}
.prop-row-custom { display: flex; gap: 4px; margin-bottom: 4px; align-items: center; }
.prop-row-custom .el-input { flex: 1; }
</style>
```

---

### [x] Task 12: CSS 来源加载集成

**Capability:** css-style-editor
**Files:**
- Modify: `src/components/PreviewPane.vue` (加载文件时解析 CSS)
- Modify: `src/components/StyleEditor.vue` (处理 StylePropertyGroups 的 change 事件)

- [ ] **Step 1: 在文件加载时解析所有 CSS 来源**

在 `AppLayout.vue` 中添加文件加载后的 CSS 解析逻辑：

```typescript
// 在 AppLayout.vue 的 handleOpenFolder 和 loadFile 逻辑后添加
import { useHtmlParser } from '../composables/useHtmlParser'
import { useCssEditor } from '../composables/useCssEditor'
import { useStyleStateStore } from '../stores/styleState'
import { useDomTreeStore } from '../stores/domTree'

const styleState = useStyleStateStore()
const domTreeStore = useDomTreeStore()
const { parseToDomTree } = useHtmlParser()
const { parseStyleTagCss, parseExternalCss } = useCssEditor()

// 当 currentFileContent 变化时，重新解析 DOM 树和 CSS
watch(() => projectStore.currentFileContent, async (content) => {
  if (!content) {
    domTreeStore.setTree([])
    styleState.setSources([])
    return
  }
  const tree = parseToDomTree(content)
  domTreeStore.setTree(tree)

  // 解析 CSS 来源
  const sources: CssSource[] = []
  // 1. 内联样式（不需要单独解析，直接从 DomNode 读取）
  // 2. <style> 标签
  const styleContents = extractStyleContent(content)
  for (const sc of styleContents) {
    const source = await parseStyleTagCss(sc.content)
    sources.push(source)
  }
  // 3. 外部 CSS
  const cssPaths = extractExternalCssPaths(content, projectStore.rootPath)
  for (const path of cssPaths) {
    const source = await parseExternalCss(path)
    if (source) sources.push(source)
  }
  styleState.setSources(sources)
})
```

这段逻辑需要添加到 AppLayout.vue 的 `<script setup>` 中，并从 useHtmlParser 引入 `extractStyleContent` 和 `extractExternalCssPaths`。

- [ ] **Step 2: StyleEditor 处理分组面板的属性变更**

修改 `StyleEditor.vue` 中 `StylePropertyGroups` 的使用：

```vue
<!-- 替换 StyleEditor.vue 中的 <StylePropertyGroups> 标签 -->
<StylePropertyGroups :element="selectedElement" @change="handleGroupPropertyChange" />
```

添加 `handleGroupPropertyChange` 方法：

```typescript
async function handleGroupPropertyChange(property: string, value: string) {
  if (!selectedElement.value) return

  // 更新内联 style 属性
  const currentStyle = selectedElement.value.attributes?.style || ''
  const pairs: Record<string, string> = {}
  currentStyle.split(';').forEach(part => {
    const [key, ...valParts] = part.split(':')
    if (key) pairs[key.trim()] = valParts.join(':').trim()
  })
  pairs[property] = value

  const newStyle = Object.entries(pairs)
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ')

  domTreeStore.updateNodeAttribute(selectedElement.value.id, 'style', newStyle)
  projectStore.markDirty()
}
```

---

### [x] Task 13: 序列化保存

**Capability:** save-and-serialize
**Files:**
- Modify: `src/components/AppLayout.vue` (添加保存逻辑)

- [ ] **Step 1: 实现保存逻辑**

在 `AppLayout.vue` 中添加保存处理：

```typescript
import { useHtmlParser } from '../composables/useHtmlParser'
import { useCssEditor } from '../composables/useCssEditor'
import { invoke } from '@tauri-apps/api/core'
import { ElMessage } from 'element-plus'

const { domTreeToHtml } = useHtmlParser()
const { serializeCss } = useCssEditor()

async function saveCurrentFile() {
  if (!projectStore.currentFilePath) return

  try {
    // 1. 序列化 HTML
    const html = domTreeToHtml(domTreeStore.domTree)
    await invoke('write_file', { path: projectStore.currentFilePath, content: html })

    // 2. 序列化变更的外部 CSS 文件
    for (const filePath of styleState.dirtyCssFiles) {
      const source = styleState.cssSources.find(s => s.filePath === filePath)
      if (source) {
        const cssContent = await serializeCss(source.ast)
        await invoke('write_file', { path: filePath, content: cssContent })
      }
    }
    styleState.clearDirtyCssFiles()

    projectStore.markClean()
    ElMessage.success('保存成功')
  } catch (e: any) {
    ElMessage.error(`文件保存失败: ${e}`)
  }
}

// 监听保存事件
window.addEventListener('app-save', saveCurrentFile)
```

---

### [x] Task 14: Undo/Redo

**Capability:** save-and-serialize
**Files:**
- Modify: `src/stores/domTree.ts` (添加快照支持)
- Modify: `src/components/AppLayout.vue` (添加 undo/redo 事件处理)

- [ ] **Step 1: 在 domTree store 中添加快照支持**

在 `src/stores/domTree.ts` 中添加：

```typescript
// 在 useDomTreeStore 函数内部顶部添加
const undoStack = ref<string[]>([])
const redoStack = ref<string[]>([])
const MAX_STACK_SIZE = 50

function pushSnapshot() {
  const snapshot = JSON.stringify(domTree.value)
  undoStack.value.push(snapshot)
  if (undoStack.value.length > MAX_STACK_SIZE) {
    undoStack.value.shift()
  }
  redoStack.value = [] // 新操作清空 redo 栈
}

function undo() {
  if (undoStack.value.length === 0) return false
  const current = JSON.stringify(domTree.value)
  redoStack.value.push(current)

  const snapshot = undoStack.value.pop()!
  domTree.value = JSON.parse(snapshot)
  return true
}

function redo() {
  if (redoStack.value.length === 0) return false
  const current = JSON.stringify(domTree.value)
  undoStack.value.push(current)

  const snapshot = redoStack.value.pop()!
  domTree.value = JSON.parse(snapshot)
  return true
}
```

在所有修改 domTree 的方法（`addNode`、`deleteNode`、`updateNodeAttribute`、`updateNodeText`、`reorderSibling`）内部，在执行修改前调用 `pushSnapshot()`。

- [ ] **Step 2: 在 AppLayout 中绑定 Undo/Redo 快捷键**

在 `AppLayout.vue` 的 `handleKeydown` 函数中已添加了 `app-undo` 和 `app-redo` 事件分发。添加监听：

```typescript
window.addEventListener('app-undo', () => {
  if (domTreeStore.undo()) {
    projectStore.markDirty()
  }
})

window.addEventListener('app-redo', () => {
  if (domTreeStore.redo()) {
    projectStore.markDirty()
  }
})
```

---

### [x] Task 15: 关闭窗口保护和集成收尾

**Capability:** save-and-serialize
**Files:**
- Modify: `src/components/AppLayout.vue`

- [ ] **Step 1: 关闭窗口时未保存变更拦截**

```typescript
// 在 AppLayout.vue onMounted 中添加
window.addEventListener('beforeunload', (e) => {
  if (projectStore.isDirty) {
    e.preventDefault()
    e.returnValue = ''
  }
})
```

对于 Tauri 窗口关闭事件，需要在 Rust 端处理（如需要后续补充）。

- [ ] **Step 2: 端到端集成验证**

1. 启动应用 `npm run tauri dev`
2. 点击"打开文件夹"，选择包含 HTML 文件和 CSS 文件的测试文件夹
3. 验证文件树显示正确
4. 点击 HTML 文件，验证 DOM 树加载
5. 点击 DOM 节点，验证 iframe 高亮
6. 点击 iframe 中元素，验证 DOM 树反向选中
7. 在右侧样式编辑器修改属性，验证 iframe 实时更新
8. 按 Ctrl+S 保存，验证文件内容更新
9. 按 Ctrl+Z 撤销，验证 DOM 恢复
10. 修改后切换文件，验证未保存提示弹窗
