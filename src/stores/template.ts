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
      const names: string[] = await invoke('list_subdirs', { dirPath: templateDir.value })
      const configs: TemplateConfig[] = []
      for (const name of names) {
        const dirPath = templateDir.value.replace(/\/$/, '') + '/' + name
        try {
          const configJson: string = await invoke('read_file', { filePath: dirPath + '/template.json' })
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
    return invoke('read_file', { filePath }) as Promise<string>
  }

  initFromStorage()

  return { templateDir, templates, setTemplateDir, loadTemplates, readTemplateFile }
})
