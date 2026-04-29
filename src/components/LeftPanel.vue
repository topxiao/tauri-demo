<script setup lang="ts">
import FileExplorer from './FileExplorer.vue'
import DomTree from './DomTree.vue'
</script>

<template>
  <div class="left-panel">
    <el-tabs>
      <el-tab-pane label="文件">
        <FileExplorer />
      </el-tab-pane>
      <el-tab-pane label="DOM 树">
        <DomTree />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.left-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.el-tabs) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

:deep(.el-tabs__content) {
  flex: 1;
  overflow-y: auto;
}

:deep(.el-tab-pane) {
  height: 100%;
}
</style>
