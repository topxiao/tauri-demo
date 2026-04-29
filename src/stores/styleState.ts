import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CssSource, MatchedRule } from '../types'

const MAX_CSS_UNDO_STACK = 50

export const useStyleStateStore = defineStore('styleState', () => {
  const cssSources = ref<CssSource[]>([])
  const activeTab = ref<string>('')
  const matchedRules = ref<MatchedRule[]>([])
  const dirtyCssFiles = ref<Set<string>>(new Set())

  // Undo / Redo stacks store JSON snapshots of cssSources
  const cssUndoStack = ref<string[]>([])
  const cssRedoStack = ref<string[]>([])

  function setSources(sources: CssSource[]) {
    cssSources.value = sources
  }

  function setActiveTab(tab: string) {
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

  function pushCssSnapshot() {
    cssUndoStack.value.push(JSON.stringify(cssSources.value))
    if (cssUndoStack.value.length > MAX_CSS_UNDO_STACK) {
      cssUndoStack.value.shift()
    }
    cssRedoStack.value = []
  }

  function undoCss() {
    if (cssUndoStack.value.length === 0) return
    cssRedoStack.value.push(JSON.stringify(cssSources.value))
    const snapshot = cssUndoStack.value.pop()!
    cssSources.value = JSON.parse(snapshot)
  }

  function redoCss() {
    if (cssRedoStack.value.length === 0) return
    cssUndoStack.value.push(JSON.stringify(cssSources.value))
    const snapshot = cssRedoStack.value.pop()!
    cssSources.value = JSON.parse(snapshot)
  }

  const getSourcesByType = computed(() => {
    return (type: CssSource['type']) =>
      cssSources.value.filter((s) => s.type === type)
  })

  return {
    cssSources,
    activeTab,
    matchedRules,
    dirtyCssFiles,
    setSources,
    setActiveTab,
    setMatchedRules,
    markCssDirty,
    clearDirtyCssFiles,
    pushCssSnapshot,
    undoCss,
    redoCss,
    getSourcesByType,
  }
})
