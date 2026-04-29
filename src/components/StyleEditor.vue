<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useDomTreeStore } from '../stores/domTree'
import { useStyleStateStore } from '../stores/styleState'
import { useProjectStore } from '../stores/project'
import { useCssEditor } from '../composables/useCssEditor'
import StylePropertyGroups from './StylePropertyGroups.vue'
import type { MatchedRule } from '../types'

const domTreeStore = useDomTreeStore()
const styleStateStore = useStyleStateStore()
const projectStore = useProjectStore()
const cssEditor = useCssEditor()

const activeTabName = ref('inline')

const selectedElement = computed(() => domTreeStore.selectedNode)

// Element display string: <tagName.class#id>
const elementLabel = computed(() => {
  const el = selectedElement.value
  if (!el || el.type !== 'element' || !el.tagName) return ''
  const tag = el.tagName
  const cls = el.attributes?.['class']
  const id = el.attributes?.['id']
  let label = `<${tag}`
  if (id) label += `#${id}`
  if (cls) {
    const classes = cls.split(/\s+/).join('.')
    label += `.${classes}`
  }
  label += '>'
  return label
})

// Matched rules grouped by source type
const inlineRules = ref<MatchedRule[]>([])
const styleTagRules = ref<MatchedRule[]>([])
const externalRules = ref<MatchedRule[]>([])

const currentRules = computed(() => {
  switch (activeTabName.value) {
    case 'inline': return inlineRules.value
    case 'style-tag': return styleTagRules.value
    case 'external': return externalRules.value
    default: return []
  }
})

async function refreshMatches() {
  const el = selectedElement.value
  if (!el || el.type !== 'element' || !el.tagName) {
    inlineRules.value = []
    styleTagRules.value = []
    externalRules.value = []
    return
  }

  const allRules = await cssEditor.findAllMatches(el, styleStateStore.cssSources)

  inlineRules.value = allRules.filter(r => r.source.type === 'inline')
  styleTagRules.value = allRules.filter(r => r.source.type === 'style-tag')
  externalRules.value = allRules.filter(r => r.source.type === 'external')

  styleStateStore.setMatchedRules(allRules)
}

// Watch selected element changes -> refresh matches
watch(() => domTreeStore.selectedNodeId, () => {
  refreshMatches()
})

// Handle property value change from rule cards
async function handlePropertyChange(rule: MatchedRule, property: string, newValue: string) {
  if (!rule.source.ast) return

  // Push CSS snapshot for undo/redo before modifying the AST
  styleStateStore.pushCssSnapshot()

  await cssEditor.updateDeclaration(rule.source.ast, rule.selector, property, newValue)

  // Mark CSS dirty
  if (rule.source.type === 'style-tag') {
    const idx = rule.source.styleTagIndex ?? 0
    styleStateStore.markCssDirty(`style-tag[${idx}]`)
  } else if (rule.source.type === 'external' && rule.source.filePath) {
    styleStateStore.markCssDirty(rule.source.filePath)
  } else if (rule.source.type === 'inline') {
    // Inline style updates are handled via StylePropertyGroups
  }

  projectStore.markDirty()
  await refreshMatches()
}

// Handle style property change from StylePropertyGroups
function handleStylePropertyChange(property: string, value: string) {
  const el = selectedElement.value
  if (!el) return

  const styles = cssEditor.parseInlineStyles(el)

  if (value === '') {
    delete styles[property]
  } else {
    styles[property] = value
  }

  const newStyle = cssEditor.serializeInlineStyles(styles)
  domTreeStore.updateNodeAttribute(el.id, 'style', newStyle)
  projectStore.markDirty()
}
</script>

<template>
  <div class="style-editor">
    <!-- Empty state -->
    <div v-if="!selectedElement || selectedElement.type !== 'element'" class="empty-state">
      请在 DOM 树中选择一个元素
    </div>

    <!-- Editor content -->
    <template v-else>
      <!-- Element info bar -->
      <div class="element-info">
        <span class="element-tag">{{ elementLabel }}</span>
      </div>

      <!-- Tabs for CSS source types -->
      <el-tabs v-model="activeTabName" class="source-tabs">
        <el-tab-pane name="inline">
          <template #label>
            内联样式
            <el-badge
              v-if="inlineRules.length > 0"
              :value="inlineRules.length"
              type="primary"
              class="tab-badge"
            />
          </template>
        </el-tab-pane>
        <el-tab-pane name="style-tag">
          <template #label>
            &lt;style&gt;
            <el-badge
              v-if="styleTagRules.length > 0"
              :value="styleTagRules.length"
              type="primary"
              class="tab-badge"
            />
          </template>
        </el-tab-pane>
        <el-tab-pane name="external">
          <template #label>
            外部CSS
            <el-badge
              v-if="externalRules.length > 0"
              :value="externalRules.length"
              type="primary"
              class="tab-badge"
            />
          </template>
        </el-tab-pane>
      </el-tabs>

      <!-- Rules list for current tab -->
      <div v-if="currentRules.length > 0" class="rules-list">
        <div v-for="(rule, rIdx) in currentRules" :key="rIdx" class="rule-card">
          <div class="rule-header">
            <span class="rule-selector">{{ rule.selector }}</span>
            <span class="rule-location">{{ rule.location }}</span>
          </div>
          <div class="rule-properties">
            <div v-for="(val, prop) in rule.declarations" :key="prop" class="property-row">
              <span class="property-name">{{ prop }}</span>
              <el-input
                :model-value="val"
                size="small"
                @update:model-value="handlePropertyChange(rule, prop as string, $event)"
              />
            </div>
          </div>
        </div>
      </div>
      <div v-else class="no-rules">
        该来源暂无匹配的 CSS 规则
      </div>

      <!-- Property groups -->
      <StylePropertyGroups
        :element="selectedElement"
        @change="handleStylePropertyChange"
      />
    </template>
  </div>
</template>

<style scoped>
.style-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
  font-size: 14px;
}

.element-info {
  padding: 8px;
  border-bottom: 1px solid #e4e7ed;
  background: #f5f7fa;
}

.element-tag {
  font-family: monospace;
  font-size: 13px;
  color: #303133;
}

.source-tabs {
  border-bottom: 1px solid #e4e7ed;
}

.tab-badge {
  margin-left: 4px;
}

.tab-badge :deep(.el-badge__content) {
  font-size: 10px;
  height: 16px;
  line-height: 16px;
  padding: 0 4px;
}

.rules-list {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rule-card {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}

.rule-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

.rule-selector {
  color: #409eff;
  font-family: monospace;
  font-size: 12px;
}

.rule-location {
  color: #909399;
  font-size: 11px;
}

.rule-properties {
  padding: 4px 8px;
}

.property-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
}

.property-name {
  min-width: 80px;
  font-family: monospace;
  font-size: 12px;
  color: #67c23a;
  flex-shrink: 0;
}

.property-row :deep(.el-input) {
  flex: 1;
}

.no-rules {
  padding: 16px;
  text-align: center;
  color: #909399;
  font-size: 13px;
}
</style>
