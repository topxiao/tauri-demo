<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { DomNode } from '../types'
import { generateNodeId } from '../utils/nodeId'

const emit = defineEmits<{
  confirm: [node: DomNode]
}>()

const visible = ref(false)
const mode = ref<'add' | 'edit' | 'addChild'>('add')
const editingNodeId = ref<string>('')
const parentForChild = ref<string>('')

const tagName = ref('')
const textContent = ref('')
const attributes = reactive<{ key: string; value: string }[]>([])

const COMMON_TAGS = [
  'div', 'span', 'p', 'a', 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody',
  'form', 'input', 'button', 'select', 'option', 'textarea', 'label',
  'section', 'article', 'header', 'footer', 'nav', 'main', 'aside',
  'strong', 'em', 'b', 'i', 'br', 'hr',
]

function resetForm() {
  tagName.value = ''
  textContent.value = ''
  attributes.splice(0, attributes.length)
}

function addAttribute() {
  attributes.push({ key: '', value: '' })
}

function removeAttribute(index: number) {
  attributes.splice(index, 1)
}

function openForAdd() {
  mode.value = 'add'
  editingNodeId.value = ''
  parentForChild.value = ''
  resetForm()
  visible.value = true
}

function openForEdit(node: DomNode) {
  mode.value = 'edit'
  editingNodeId.value = node.id
  parentForChild.value = ''
  resetForm()

  if (node.type === 'text') {
    tagName.value = '#text'
    textContent.value = node.textContent || ''
  } else if (node.type === 'comment') {
    tagName.value = '#comment'
    textContent.value = node.textContent || ''
  } else {
    tagName.value = node.tagName || 'div'
    textContent.value = ''
    if (node.attributes) {
      for (const [key, value] of Object.entries(node.attributes)) {
        attributes.push({ key, value })
      }
    }
  }

  visible.value = true
}

function openAddChild(parentId: string) {
  mode.value = 'addChild'
  editingNodeId.value = ''
  parentForChild.value = parentId
  resetForm()
  visible.value = true
}

function handleConfirm() {
  const attrs: Record<string, string> = {}
  for (const attr of attributes) {
    if (attr.key.trim()) {
      attrs[attr.key.trim()] = attr.value
    }
  }

  let node: DomNode

  if (tagName.value === '#text') {
    node = {
      id: mode.value === 'edit' ? editingNodeId.value : generateNodeId(),
      type: 'text',
      textContent: textContent.value,
      parentId: mode.value === 'addChild' ? parentForChild.value : undefined,
    }
  } else if (tagName.value === '#comment') {
    node = {
      id: mode.value === 'edit' ? editingNodeId.value : generateNodeId(),
      type: 'comment',
      textContent: textContent.value,
      parentId: mode.value === 'addChild' ? parentForChild.value : undefined,
    }
  } else {
    node = {
      id: mode.value === 'edit' ? editingNodeId.value : generateNodeId(),
      type: 'element',
      tagName: tagName.value || 'div',
      attributes: Object.keys(attrs).length > 0 ? attrs : undefined,
      children: mode.value === 'edit' ? undefined : [],
      parentId: mode.value === 'addChild' ? parentForChild.value : undefined,
    }
  }

  emit('confirm', node)
  visible.value = false
}

defineExpose({ openForAdd, openForEdit, openAddChild })
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="mode === 'add' ? '添加节点' : mode === 'edit' ? '编辑节点' : '添加子节点'"
    width="480px"
    :close-on-click-modal="false"
  >
    <el-form label-width="80px">
      <el-form-item label="标签">
        <el-select
          v-model="tagName"
          filterable
          allow-create
          default-first-option
          placeholder="选择或输入标签名"
          style="width: 100%"
        >
          <el-option
            v-for="tag in COMMON_TAGS"
            :key="tag"
            :label="tag"
            :value="tag"
          />
          <el-option label="#text (文本)" value="#text" />
          <el-option label="#comment (注释)" value="#comment" />
        </el-select>
      </el-form-item>

      <el-form-item v-if="tagName === '#text' || tagName === '#comment'" label="内容">
        <el-input
          v-model="textContent"
          type="textarea"
          :rows="4"
          placeholder="文本内容"
        />
      </el-form-item>

      <el-form-item
        v-if="tagName !== '#text' && tagName !== '#comment'"
        label="属性"
      >
        <div class="attr-list">
          <div v-for="(attr, index) in attributes" :key="index" class="attr-row">
            <el-input v-model="attr.key" placeholder="属性名" class="attr-input" />
            <span class="attr-eq">=</span>
            <el-input v-model="attr.value" placeholder="属性值" class="attr-input" />
            <el-button
              type="danger"
              :icon="Delete"
              circle
              size="small"
              @click="removeAttribute(index)"
            />
          </div>
          <el-button size="small" @click="addAttribute">+ 添加属性</el-button>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleConfirm">确认</el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts">
import { Delete } from '@element-plus/icons-vue'
export default { components: { Delete } }
</script>

<style scoped>
.attr-list {
  width: 100%;
}

.attr-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
}

.attr-input {
  flex: 1;
}

.attr-eq {
  color: #909399;
  flex-shrink: 0;
}
</style>
