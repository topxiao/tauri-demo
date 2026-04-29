<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDomTreeStore } from '../stores/domTree'
import DomNodeEditor from './DomNodeEditor.vue'
import type { DomNode } from '../types'

const domTreeStore = useDomTreeStore()
const nodeEditor = ref<InstanceType<typeof DomNodeEditor> | null>(null)

// Context menu
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  nodeId: '',
})

// Inline editing
const inlineEditId = ref<string | null>(null)
const inlineEditText = ref('')

const treeData = computed(() => domTreeStore.domTree)

const hasSelection = computed(() => domTreeStore.selectedNodeId !== null)

const treeProps = {
  children: 'children',
  label: 'tagName',
}

function getNodeLabel(node: DomNode): string {
  if (node.type === 'text') {
    const text = node.textContent || ''
    return text.length > 30 ? text.slice(0, 30) + '...' : text
  }
  if (node.type === 'comment') {
    const text = node.textContent || ''
    return text.length > 30 ? '<!-- ' + text.slice(0, 26) + '... -->' : '<!-- ' + text + ' -->'
  }
  let label = '<' + (node.tagName || 'div')
  if (node.attributes) {
    if (node.attributes.id) {
      label += ' #' + node.attributes.id
    }
    if (node.attributes.class) {
      label += ' .' + node.attributes.class.split(/\s+/).join('.')
    }
  }
  label += '>'
  return label
}

function handleNodeClick(data: DomNode) {
  domTreeStore.selectNode(data.id)
}

function handleNodeDblClick(data: DomNode) {
  if (data.type === 'text') {
    startInlineEdit(data)
  } else {
    nodeEditor.value?.openForEdit(data)
  }
}

function startInlineEdit(node: DomNode) {
  inlineEditId.value = node.id
  inlineEditText.value = node.textContent || ''
}

function finishInlineEdit() {
  if (inlineEditId.value) {
    domTreeStore.updateNodeText(inlineEditId.value, inlineEditText.value)
    inlineEditId.value = null
  }
}

function cancelInlineEdit() {
  inlineEditId.value = null
}

function handleContextMenu(e: MouseEvent, data: DomNode) {
  e.preventDefault()
  domTreeStore.selectNode(data.id)
  contextMenu.value = {
    visible: true,
    x: e.clientX,
    y: e.clientY,
    nodeId: data.id,
  }
}

function closeContextMenu() {
  contextMenu.value.visible = false
}

function contextAddChild() {
  nodeEditor.value?.openAddChild(contextMenu.value.nodeId)
  closeContextMenu()
}

function contextEdit() {
  const node = domTreeStore.findNode(domTreeStore.domTree, contextMenu.value.nodeId)
  if (node) {
    nodeEditor.value?.openForEdit(node)
  }
  closeContextMenu()
}

const copiedNode = ref<DomNode | null>(null)

function contextCopy() {
  const node = domTreeStore.findNode(domTreeStore.domTree, contextMenu.value.nodeId)
  if (node) {
    copiedNode.value = JSON.parse(JSON.stringify(node))
  }
  closeContextMenu()
}

function contextDelete() {
  domTreeStore.deleteNode(contextMenu.value.nodeId)
  closeContextMenu()
}

function handleAdd() {
  nodeEditor.value?.openForAdd()
}

function handleDelete() {
  if (domTreeStore.selectedNodeId) {
    domTreeStore.deleteNode(domTreeStore.selectedNodeId)
  }
}

function handleEditorConfirm(node: DomNode) {
  if (nodeEditor.value) {
    // We determine mode based on whether the dialog was opened in edit vs add/addChild
    // We check if the node already exists
    const existing = domTreeStore.findNode(domTreeStore.domTree, node.id)
    if (existing) {
      // Edit mode: update the existing node's properties
      existing.tagName = node.tagName
      existing.attributes = node.attributes
      existing.textContent = node.textContent
      existing.type = node.type
    } else {
      // Add or addChild mode
      const parentId = node.parentId
      if (parentId) {
        // addNode expects parentId, the new node, and optional index
        domTreeStore.addNode(parentId, node)
      } else {
        // Add at root level
        domTreeStore.domTree.push(node)
      }
    }
  }
}

function allowDrop(
  _draggingNode: any,
  _dropNode: any,
  type: 'prev' | 'inner' | 'next'
): boolean {
  // Only allow same-level reordering (prev/next), not inner drops
  return type !== 'inner'
}

function handleNodeDrop(
  draggingNode: any,
  dropNode: any,
  dropType: 'before' | 'after' | 'inner',
  _ev: any
) {
  if (dropType === 'inner') return

  const dragId: string = draggingNode.data.id
  const dropId: string = dropNode.data.id
  const parent = domTreeStore.findParent(domTreeStore.domTree, dropId)
  const parentId = parent ? parent.id : null

  const siblings = parentId
    ? domTreeStore.findNode(domTreeStore.domTree, parentId)?.children
    : domTreeStore.domTree
  if (!siblings) return

  const newIndex = siblings.findIndex((n) => n.id === dropId)
  const adjustedIndex = dropType === 'after' ? newIndex + 1 : newIndex

  domTreeStore.reorderSibling(parentId, dragId, adjustedIndex)
}
</script>

<template>
  <div class="dom-tree" @click="closeContextMenu">
    <div class="toolbar">
      <el-button size="small" @click="handleAdd">+ 添加</el-button>
      <el-button
        size="small"
        :disabled="!hasSelection"
        @click="handleDelete"
      >
        删除
      </el-button>
    </div>

    <el-tree
      v-if="treeData.length > 0"
      :data="treeData"
      :props="treeProps"
      node-key="id"
      draggable
      default-expand-all
      :allow-drop="allowDrop"
      :highlight-current="true"
      @node-click="handleNodeClick"
      @node-drag-end="handleNodeDrop"
      @node-contextmenu="handleContextMenu"
    >
      <template #default="{ data }">
        <div
          class="dom-node"
          :class="{
            'is-text': data.type === 'text',
            'is-comment': data.type === 'comment',
            'is-element': data.type === 'element',
            'is-selected': data.id === domTreeStore.selectedNodeId,
          }"
          @dblclick.stop="handleNodeDblClick(data)"
        >
          <template v-if="inlineEditId === data.id">
            <input
              v-model="inlineEditText"
              class="inline-edit"
              @keydown.enter="finishInlineEdit"
              @keydown.escape="cancelInlineEdit"
              @blur="finishInlineEdit"
              autofocus
            />
          </template>
          <template v-else>
            {{ getNodeLabel(data) }}
          </template>
        </div>
      </template>
    </el-tree>

    <div v-else class="empty-state">
      暂无 DOM 树数据
    </div>

    <DomNodeEditor ref="nodeEditor" @confirm="handleEditorConfirm" />

    <Teleport to="body">
      <div
        v-if="contextMenu.visible"
        class="context-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
        @click.stop
      >
        <div class="context-menu-item" @click="contextAddChild">添加子节点</div>
        <div class="context-menu-item" @click="contextEdit">编辑</div>
        <div class="context-menu-item" @click="contextCopy">复制</div>
        <div class="context-menu-item danger" @click="contextDelete">删除</div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.dom-tree {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0 4px;
}

.dom-tree :deep(.el-tree) {
  padding: 4px;
}

.toolbar {
  display: flex;
  gap: 6px;
  padding: 6px 8px;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
}

.dom-node {
  font-size: 13px;
  font-family: 'Consolas', 'Monaco', monospace;
  padding: 1px 4px;
  border-radius: 2px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dom-node.is-element {
  color: #e6a23c;
}

.dom-node.is-text {
  color: #67c23a;
}

.dom-node.is-comment {
  color: #909399;
}

.dom-node.is-selected {
  background: #ecf5ff;
}

.inline-edit {
  width: 100%;
  border: 1px solid #409eff;
  border-radius: 2px;
  padding: 0 4px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: #909399;
  font-size: 13px;
}

.context-menu {
  position: fixed;
  z-index: 9999;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 4px 0;
  min-width: 120px;
}

.context-menu-item {
  padding: 6px 16px;
  font-size: 13px;
  color: #303133;
  cursor: pointer;
}

.context-menu-item:hover {
  background: #f5f7fa;
}

.context-menu-item.danger {
  color: #f56c6c;
}

.context-menu-item.danger:hover {
  background: #fef0f0;
}
</style>
