<script setup lang="ts">
import { computed } from 'vue'
import { useProjectStore } from '../stores/project'
import type { FileEntry } from '../types'

const projectStore = useProjectStore()

const isHtmlFile = (name: string) =>
  name.endsWith('.html') || name.endsWith('.htm')

const treeProps = computed(() => ({
  children: 'children',
  label: 'name',
}))

function handleNodeClick(data: FileEntry) {
  if (data.isDir) return
  loadFileWithConfirm(data.path)
}

async function loadFileWithConfirm(filePath: string) {
  if (projectStore.isDirty && projectStore.currentFilePath) {
    try {
      await ElMessageBox.confirm(
        '当前文件未保存，是否保存更改？',
        '未保存的更改',
        {
          confirmButtonText: '保存',
          cancelButtonText: '不保存',
          distinguishCancelAndClose: true,
          type: 'warning',
        },
      )
      // User clicked "保存" (confirm)
      window.dispatchEvent(new CustomEvent('app-save'))
      // Wait briefly for the save to complete
      await new Promise((r) => setTimeout(r, 200))
    } catch (action) {
      if (action === 'cancel') {
        // User clicked "不保存" — proceed to load
      } else {
        // User clicked close (X) or pressed Esc — cancel the switch
        return
      }
    }
  }
  await projectStore.loadFile(filePath)
}
</script>

<template>
  <div class="file-explorer">
    <div v-if="!projectStore.rootPath" class="empty-state">
      <el-button type="primary" @click="projectStore.openFolder()">
        打开文件夹
      </el-button>
    </div>
    <el-tree
      v-else
      :data="projectStore.fileTree"
      :props="treeProps"
      node-key="path"
      :default-expand-all="false"
      @node-click="handleNodeClick"
    >
      <template #default="{ data }">
        <span
          class="tree-node"
          :class="{
            'is-html': !data.isDir && isHtmlFile(data.name),
            'is-file': !data.isDir && !isHtmlFile(data.name),
            'is-current': data.path === projectStore.currentFilePath,
          }"
        >
          <el-icon v-if="data.isDir" size="14"><Folder /></el-icon>
          <el-icon v-else-if="isHtmlFile(data.name)" size="14"><Document /></el-icon>
          <el-icon v-else size="14"><Tickets /></el-icon>
          <span class="node-label">{{ data.name }}</span>
        </span>
      </template>
    </el-tree>
  </div>
</template>

<script lang="ts">
import { ElMessageBox } from 'element-plus'
import { Folder, Document, Tickets } from '@element-plus/icons-vue'

export default {
  components: { Folder, Document, Tickets },
}
</script>

<style scoped>
.file-explorer {
  height: 100%;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  overflow: hidden;
}

.tree-node.is-html {
  color: #409eff;
  cursor: pointer;
}

.tree-node.is-file {
  color: #909399;
  cursor: pointer;
}

.tree-node.is-current {
  font-weight: bold;
  background: #ecf5ff;
  border-radius: 3px;
  padding: 0 4px;
}

.node-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
