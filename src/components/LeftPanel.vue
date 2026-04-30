<script setup lang="ts">
import { ref } from 'vue'
import FileExplorer from './FileExplorer.vue'
import DomTree from './DomTree.vue'
import TemplatePanel from './TemplatePanel.vue'

const activeTab = ref<'dom' | 'files' | 'templates'>('files')
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
      <TemplatePanel v-else-if="activeTab === 'templates'" />
      <FileExplorer v-else />
    </div>
  </div>
</template>

<style scoped>
.left-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.left-header {
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

.left-content {
  flex: 1;
  overflow-y: auto;
}
</style>
