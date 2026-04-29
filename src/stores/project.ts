import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import type { FileEntry } from '../types'

export const useProjectStore = defineStore('project', () => {
  const rootPath = ref<string>('')
  const fileTree = ref<FileEntry[]>([])
  const currentFilePath = ref<string>('')
  const currentFileContent = ref<string>('')
  const isDirty = ref<boolean>(false)

  const currentFileName = computed(() => {
    if (!currentFilePath.value) return ''
    return currentFilePath.value.split(/[/\\]/).pop() || ''
  })

  const htmlFiles = computed(() => {
    const result: FileEntry[] = []
    function walk(entries: FileEntry[]) {
      for (const entry of entries) {
        if (entry.isDir && entry.children) {
          walk(entry.children)
        } else if (entry.name.endsWith('.html') || entry.name.endsWith('.htm')) {
          result.push(entry)
        }
      }
    }
    walk(fileTree.value)
    return result
  })

  async function openFolder() {
    const folderPath = await invoke<string | null>('open_folder')
    if (folderPath) {
      rootPath.value = folderPath
      const entries = await invoke<FileEntry[]>('list_files', { dirPath: folderPath })
      fileTree.value = entries
      currentFilePath.value = ''
      currentFileContent.value = ''
      isDirty.value = false
    }
  }

  async function loadFile(filePath: string) {
    const content = await invoke<string>('read_file', { filePath })
    currentFilePath.value = filePath
    currentFileContent.value = content
    isDirty.value = false
  }

  async function saveFile() {
    if (currentFilePath.value && isDirty.value) {
      await invoke('write_file', {
        filePath: currentFilePath.value,
        content: currentFileContent.value,
      })
      isDirty.value = false
    }
  }

  function markDirty() {
    isDirty.value = true
  }

  function markClean() {
    isDirty.value = false
  }

  return {
    rootPath,
    fileTree,
    currentFilePath,
    currentFileContent,
    isDirty,
    currentFileName,
    htmlFiles,
    openFolder,
    loadFile,
    saveFile,
    markDirty,
    markClean,
  }
})
