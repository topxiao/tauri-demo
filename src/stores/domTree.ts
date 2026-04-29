import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DomNode } from '../types'

const MAX_UNDO_STACK = 50

export const useDomTreeStore = defineStore('domTree', () => {
  const domTree = ref<DomNode[]>([])
  const selectedNodeId = ref<string | null>(null)
  const expandedNodeIds = ref<Set<string>>(new Set())

  // Undo / Redo stacks store JSON snapshots of domTree
  const undoStack = ref<string[]>([])
  const redoStack = ref<string[]>([])

  const selectedNode = computed<DomNode | null>(() => {
    if (!selectedNodeId.value) return null
    return findNode(domTree.value, selectedNodeId.value)
  })

  function setTree(tree: DomNode[]) {
    domTree.value = tree
    selectedNodeId.value = null
    expandedNodeIds.value = new Set()
  }

  function selectNode(nodeId: string | null) {
    selectedNodeId.value = nodeId
  }

  function clearSelection() {
    selectedNodeId.value = null
  }

  function toggleExpand(nodeId: string) {
    if (expandedNodeIds.value.has(nodeId)) {
      expandedNodeIds.value.delete(nodeId)
    } else {
      expandedNodeIds.value.add(nodeId)
    }
  }

  function pushSnapshot() {
    undoStack.value.push(JSON.stringify(domTree.value))
    if (undoStack.value.length > MAX_UNDO_STACK) {
      undoStack.value.shift()
    }
    redoStack.value = []
  }

  function undo() {
    if (undoStack.value.length === 0) return
    redoStack.value.push(JSON.stringify(domTree.value))
    const snapshot = undoStack.value.pop()!
    domTree.value = JSON.parse(snapshot)
  }

  function redo() {
    if (redoStack.value.length === 0) return
    undoStack.value.push(JSON.stringify(domTree.value))
    const snapshot = redoStack.value.pop()!
    domTree.value = JSON.parse(snapshot)
  }

  function findNode(nodes: DomNode[], nodeId: string): DomNode | null {
    for (const node of nodes) {
      if (node.id === nodeId) return node
      if (node.children) {
        const found = findNode(node.children, nodeId)
        if (found) return found
      }
    }
    return null
  }

  function findParent(nodes: DomNode[], nodeId: string): DomNode | null {
    for (const node of nodes) {
      if (node.children) {
        for (const child of node.children) {
          if (child.id === nodeId) return node
        }
        const found = findParent(node.children, nodeId)
        if (found) return found
      }
    }
    return null
  }

  function addNode(parentId: string, node: DomNode, index?: number) {
    pushSnapshot()
    const parent = findNode(domTree.value, parentId)
    if (!parent) return
    if (!parent.children) {
      parent.children = []
    }
    node.parentId = parentId
    if (index !== undefined) {
      parent.children.splice(index, 0, node)
    } else {
      parent.children.push(node)
    }
  }

  function deleteNode(nodeId: string) {
    pushSnapshot()
    function removeFromList(nodes: DomNode[]): boolean {
      const idx = nodes.findIndex((n) => n.id === nodeId)
      if (idx !== -1) {
        nodes.splice(idx, 1)
        return true
      }
      for (const node of nodes) {
        if (node.children && removeFromList(node.children)) {
          return true
        }
      }
      return false
    }
    removeFromList(domTree.value)
    if (selectedNodeId.value === nodeId) {
      selectedNodeId.value = null
    }
    expandedNodeIds.value.delete(nodeId)
  }

  function updateNodeAttribute(nodeId: string, attrName: string, attrValue: string) {
    pushSnapshot()
    const node = findNode(domTree.value, nodeId)
    if (!node) return
    if (!node.attributes) {
      node.attributes = {}
    }
    node.attributes[attrName] = attrValue
  }

  function updateNodeText(nodeId: string, text: string) {
    pushSnapshot()
    const node = findNode(domTree.value, nodeId)
    if (!node) return
    node.textContent = text
  }

  function reorderSibling(parentId: string | null, nodeId: string, newIndex: number) {
    pushSnapshot()
    const siblings = parentId
      ? findNode(domTree.value, parentId)?.children
      : domTree.value
    if (!siblings) return

    const oldIndex = siblings.findIndex((n) => n.id === nodeId)
    if (oldIndex === -1) return

    const [moved] = siblings.splice(oldIndex, 1)
    siblings.splice(newIndex, 0, moved)
  }

  return {
    domTree,
    selectedNodeId,
    expandedNodeIds,
    selectedNode,
    setTree,
    selectNode,
    clearSelection,
    toggleExpand,
    findNode,
    findParent,
    addNode,
    deleteNode,
    updateNodeAttribute,
    updateNodeText,
    reorderSibling,
    pushSnapshot,
    undo,
    redo,
  }
})
