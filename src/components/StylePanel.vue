<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { DomNode } from '../types'
import { useCssEditor } from '../composables/useCssEditor'
import StepperInput from './StepperInput.vue'
import ButtonGroupSelect from './ButtonGroupSelect.vue'
import ColorInput from './ColorInput.vue'

const props = defineProps<{
  element: DomNode
}>()

const emit = defineEmits<{
  change: [property: string, value: string]
}>()

const { parseInlineStyles } = useCssEditor()

const ALL_SECTIONS = ['margin', 'padding', 'size', 'boxFill', 'overflowX', 'overflowY', 'flex', 'font', 'textDecor', 'background', 'border', 'effect', 'custom'] as const

const CATEGORY_SECTIONS: Record<string, string[]> = {
  block: [...ALL_SECTIONS],
  textInline: ['margin', 'padding', 'font', 'textDecor', 'background', 'border', 'effect', 'custom'],
  heading: ['margin', 'padding', 'size', 'font', 'textDecor', 'background', 'border', 'effect', 'custom'],
  media: ['margin', 'padding', 'size', 'background', 'border', 'effect', 'custom'],
  iframe: ['margin', 'padding', 'size', 'overflowX', 'overflowY', 'background', 'border', 'effect', 'custom'],
  listItem: ['margin', 'padding', 'size', 'font', 'textDecor', 'background', 'border', 'effect', 'custom'],
  tablePart: ['margin', 'padding', 'size', 'background', 'border', 'effect', 'custom'],
  formElement: ['margin', 'padding', 'size', 'font', 'textDecor', 'background', 'border', 'effect', 'custom'],
}

const TAG_CATEGORIES: Record<string, string> = {
  'div': 'block', 'section': 'block', 'article': 'block', 'aside': 'block',
  'main': 'block', 'header': 'block', 'footer': 'block', 'nav': 'block',
  'figure': 'block', 'figcaption': 'block', 'details': 'block', 'summary': 'block',
  'dialog': 'block', 'form': 'block', 'fieldset': 'block',
  'span': 'textInline', 'a': 'textInline', 'em': 'textInline', 'strong': 'textInline',
  'b': 'textInline', 'i': 'textInline', 'u': 'textInline', 's': 'textInline',
  'mark': 'textInline', 'small': 'textInline', 'sub': 'textInline', 'sup': 'textInline',
  'abbr': 'textInline', 'cite': 'textInline', 'q': 'textInline', 'time': 'textInline',
  'del': 'textInline', 'ins': 'textInline', 'address': 'textInline',
  'label': 'textInline', 'legend': 'textInline', 'code': 'textInline',
  'h1': 'heading', 'h2': 'heading', 'h3': 'heading', 'h4': 'heading',
  'h5': 'heading', 'h6': 'heading', 'p': 'heading', 'blockquote': 'heading', 'pre': 'heading',
  'img': 'media', 'video': 'media', 'audio': 'media', 'canvas': 'media',
  'svg': 'media', 'embed': 'media', 'object': 'media', 'picture': 'media',
  'source': 'media', 'map': 'media', 'area': 'media',
  'iframe': 'iframe',
  'ul': 'listItem', 'ol': 'listItem', 'li': 'listItem',
  'dl': 'listItem', 'dt': 'listItem', 'dd': 'listItem',
  'table': 'tablePart', 'thead': 'tablePart', 'tbody': 'tablePart',
  'tfoot': 'tablePart', 'tr': 'tablePart', 'td': 'tablePart', 'th': 'tablePart',
  'caption': 'tablePart', 'colgroup': 'tablePart', 'col': 'tablePart',
  'input': 'formElement', 'button': 'formElement', 'select': 'formElement',
  'option': 'formElement', 'optgroup': 'formElement', 'textarea': 'formElement',
  'datalist': 'formElement', 'output': 'formElement', 'progress': 'formElement', 'meter': 'formElement',
}

const collapsed = ref<Record<string, boolean>>({
  margin: false,
  padding: false,
  size: true,
  boxFill: true,
  overflowX: true,
  overflowY: true,
  flex: false,
  font: false,
  textDecor: true,
  background: true,
  border: true,
  effect: true,
  custom: true,
})

function toggleSection(key: string) {
  collapsed.value[key] = !collapsed.value[key]
}

const form = ref<Record<string, string>>({})

const isFlex = computed(() => form.value['display'] === 'flex')

const visibleSections = computed(() => {
  const tag = (props.element.tagName || '').toLowerCase()
  const category = TAG_CATEGORIES[tag]
  const sections = category ? CATEGORY_SECTIONS[category] : [...ALL_SECTIONS]
  return new Set(sections)
})

const bgMode = computed(() => {
  const bgImg = form.value['background-image']
  const bg = form.value['background-color']
  if (bgImg) return 'image'
  if (bg) return 'color'
  return ''
})

function setBgMode(mode: string) {
  if (mode === bgMode.value) {
    emit('change', 'background-color', '')
    emit('change', 'background-image', '')
  } else if (mode === 'color') {
    emit('change', 'background-image', '')
  } else if (mode === 'image') {
    emit('change', 'background-color', '')
  }
}

const radiusCorners = computed(() => {
  const raw = form.value['border-radius'] || ''
  const parts = raw.split(/\s+/)
  return {
    topLeft: parts[0] || '',
    topRight: parts[1] || parts[0] || '',
    bottomRight: parts[2] || parts[0] || '',
    bottomLeft: parts[3] || parts[1] || parts[0] || '',
  }
})

function setRadiusCorner(corner: 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft', val: string) {
  const c = { ...radiusCorners.value, [corner]: val }
  const { topLeft, topRight, bottomRight, bottomLeft } = c
  if (topLeft === topRight && topRight === bottomRight && bottomRight === bottomLeft) {
    handleChange('border-radius', topLeft)
  } else if (topRight === bottomLeft && topLeft === bottomRight) {
    handleChange('border-radius', `${topLeft} ${topRight}`)
  } else {
    handleChange('border-radius', `${topLeft} ${topRight} ${bottomRight} ${bottomLeft}`)
  }
}

const boxFillValue = computed(() => {
  const f = form.value['flex']
  if (f === '1') return 'flex:1'
  if (f === '2') return 'flex:2'
  const w = form.value['width']
  if (w === 'auto') return 'auto'
  return ''
})

function setBoxFill(val: string) {
  if (val === boxFillValue.value) {
    emit('change', 'flex', '')
    emit('change', 'width', '')
    return
  }
  if (val === 'auto') {
    emit('change', 'width', 'auto')
    emit('change', 'flex', '')
  } else if (val === 'flex:1') {
    emit('change', 'flex', '1')
    emit('change', 'width', '')
  } else if (val === 'flex:2') {
    emit('change', 'flex', '2')
    emit('change', 'width', '')
  }
}

const customProps = ref<{ key: string; value: string }[]>([])

const trackedProps = [
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'width', 'height', 'max-width', 'max-height',
  'flex', 'display',
  'overflow-x', 'overflow-y',
  'flex-direction', 'justify-content', 'align-items', 'flex-wrap', 'gap',
  'font-weight', 'font-size', 'line-height', 'text-align', 'color',
  'text-decoration', 'letter-spacing',
  'background-color', 'background-image',
  'border-width', 'border-style', 'border-color', 'border-radius',
  'opacity', 'box-shadow',
]

function loadFromElement() {
  const styles = parseInlineStyles(props.element)
  const init: Record<string, string> = {}
  for (const key of trackedProps) {
    init[key] = styles[key] || ''
  }
  form.value = init
  customProps.value = []
  for (const [key, val] of Object.entries(styles)) {
    if (!trackedProps.includes(key)) {
      customProps.value.push({ key, value: val })
    }
  }
}

watch(() => props.element.id, () => {
  loadFromElement()
}, { immediate: true })

function handleChange(property: string, value: string) {
  form.value[property] = value
  emit('change', property, value)
}

function addCustomProp() {
  customProps.value.push({ key: '', value: '' })
}

function removeCustomProp(index: number) {
  const prop = customProps.value[index]
  if (prop.key.trim()) {
    emit('change', prop.key.trim(), '')
  }
  customProps.value.splice(index, 1)
}

function applyCustomProp(index: number) {
  const prop = customProps.value[index]
  if (prop.key.trim()) {
    emit('change', prop.key.trim(), prop.value)
  }
}
</script>

<template>
  <div class="style-panel">
    <!-- 外边距 -->
    <section v-if="visibleSections.has('margin')" class="panel-section">
      <div class="section-header" @click="toggleSection('margin')">
        <span class="section-arrow">{{ collapsed.margin ? '▶' : '▼' }}</span>
        <span class="section-title">外边距</span>
      </div>
      <div v-show="!collapsed.margin" class="section-body">
        <div class="field-row">
          <label>上</label>
          <StepperInput :model-value="form['margin-top']" @update:model-value="handleChange('margin-top', $event)" />
        </div>
        <div class="field-row">
          <label>右</label>
          <StepperInput :model-value="form['margin-right']" @update:model-value="handleChange('margin-right', $event)" />
        </div>
        <div class="field-row">
          <label>下</label>
          <StepperInput :model-value="form['margin-bottom']" @update:model-value="handleChange('margin-bottom', $event)" />
        </div>
        <div class="field-row">
          <label>左</label>
          <StepperInput :model-value="form['margin-left']" @update:model-value="handleChange('margin-left', $event)" />
        </div>
      </div>
    </section>

    <!-- 间距（内边距） -->
    <section v-if="visibleSections.has('padding')" class="panel-section">
      <div class="section-header" @click="toggleSection('padding')">
        <span class="section-arrow">{{ collapsed.padding ? '▶' : '▼' }}</span>
        <span class="section-title">间距</span>
      </div>
      <div v-show="!collapsed.padding" class="section-body">
        <div class="field-row">
          <label>上</label>
          <StepperInput :model-value="form['padding-top']" @update:model-value="handleChange('padding-top', $event)" />
        </div>
        <div class="field-row">
          <label>右</label>
          <StepperInput :model-value="form['padding-right']" @update:model-value="handleChange('padding-right', $event)" />
        </div>
        <div class="field-row">
          <label>下</label>
          <StepperInput :model-value="form['padding-bottom']" @update:model-value="handleChange('padding-bottom', $event)" />
        </div>
        <div class="field-row">
          <label>左</label>
          <StepperInput :model-value="form['padding-left']" @update:model-value="handleChange('padding-left', $event)" />
        </div>
      </div>
    </section>

    <!-- 尺寸 -->
    <section v-if="visibleSections.has('size')" class="panel-section">
      <div class="section-header" @click="toggleSection('size')">
        <span class="section-arrow">{{ collapsed.size ? '▶' : '▼' }}</span>
        <span class="section-title">尺寸</span>
      </div>
      <div v-show="!collapsed.size" class="section-body">
        <div class="field-row">
          <label>宽度</label>
          <StepperInput :model-value="form['width']" @update:model-value="handleChange('width', $event)" />
        </div>
        <div class="field-row">
          <label>高度</label>
          <StepperInput :model-value="form['height']" @update:model-value="handleChange('height', $event)" />
        </div>
        <div class="field-row">
          <label>最大宽</label>
          <StepperInput :model-value="form['max-width']" @update:model-value="handleChange('max-width', $event)" />
        </div>
        <div class="field-row">
          <label>最大高</label>
          <StepperInput :model-value="form['max-height']" @update:model-value="handleChange('max-height', $event)" />
        </div>
      </div>
    </section>

    <!-- 盒宽填充 -->
    <section v-if="visibleSections.has('boxFill')" class="panel-section">
      <div class="section-header" @click="toggleSection('boxFill')">
        <span class="section-arrow">{{ collapsed.boxFill ? '▶' : '▼' }}</span>
        <span class="section-title">盒宽填充</span>
      </div>
      <div v-show="!collapsed.boxFill" class="section-body">
        <ButtonGroupSelect
          :model-value="boxFillValue"
          @update:model-value="setBoxFill"
          :options="[
            { label: '无', value: '' },
            { label: '自动', value: 'auto' },
            { label: '1等分', value: 'flex:1' },
            { label: '2等分', value: 'flex:2' },
          ]"
        />
      </div>
    </section>

    <!-- 横轴溢出 -->
    <section v-if="visibleSections.has('overflowX')" class="panel-section">
      <div class="section-header" @click="toggleSection('overflowX')">
        <span class="section-arrow">{{ collapsed.overflowX ? '▶' : '▼' }}</span>
        <span class="section-title">横轴溢出</span>
      </div>
      <div v-show="!collapsed.overflowX" class="section-body">
        <ButtonGroupSelect
          :model-value="form['overflow-x']"
          @update:model-value="handleChange('overflow-x', $event)"
          :options="[
            { label: '默认', value: 'visible' },
            { label: '自动', value: 'auto' },
            { label: '隐藏', value: 'hidden' },
            { label: '滚动', value: 'scroll' },
          ]"
        />
      </div>
    </section>

    <!-- 纵轴溢出 -->
    <section v-if="visibleSections.has('overflowY')" class="panel-section">
      <div class="section-header" @click="toggleSection('overflowY')">
        <span class="section-arrow">{{ collapsed.overflowY ? '▶' : '▼' }}</span>
        <span class="section-title">纵轴溢出</span>
      </div>
      <div v-show="!collapsed.overflowY" class="section-body">
        <ButtonGroupSelect
          :model-value="form['overflow-y']"
          @update:model-value="handleChange('overflow-y', $event)"
          :options="[
            { label: '默认', value: 'visible' },
            { label: '自动', value: 'auto' },
            { label: '隐藏', value: 'hidden' },
            { label: '滚动', value: 'scroll' },
          ]"
        />
      </div>
    </section>

    <!-- Flex 布局（条件显示） -->
    <section v-if="visibleSections.has('flex') && isFlex" class="panel-section">
      <div class="section-header" @click="toggleSection('flex')">
        <span class="section-arrow">{{ collapsed.flex ? '▶' : '▼' }}</span>
        <span class="section-title">Flex 布局</span>
      </div>
      <div v-show="!collapsed.flex" class="section-body">
        <div class="field-row">
          <label>方向</label>
          <ButtonGroupSelect
            :model-value="form['flex-direction']"
            @update:model-value="handleChange('flex-direction', $event)"
            :options="[
              { label: '横', value: 'row' },
              { label: '横反', value: 'row-reverse' },
              { label: '纵', value: 'column' },
              { label: '纵反', value: 'column-reverse' },
            ]"
          />
        </div>
        <div class="field-row">
          <label>主轴</label>
          <ButtonGroupSelect
            :model-value="form['justify-content']"
            @update:model-value="handleChange('justify-content', $event)"
            :options="[
              { label: '起始', value: 'flex-start' },
              { label: '居中', value: 'center' },
              { label: '末尾', value: 'flex-end' },
              { label: '之间', value: 'space-between' },
              { label: '周围', value: 'space-around' },
            ]"
          />
        </div>
        <div class="field-row">
          <label>交叉轴</label>
          <ButtonGroupSelect
            :model-value="form['align-items']"
            @update:model-value="handleChange('align-items', $event)"
            :options="[
              { label: '起始', value: 'flex-start' },
              { label: '居中', value: 'center' },
              { label: '末尾', value: 'flex-end' },
              { label: '拉伸', value: 'stretch' },
            ]"
          />
        </div>
        <div class="field-row">
          <label>换行</label>
          <ButtonGroupSelect
            :model-value="form['flex-wrap']"
            @update:model-value="handleChange('flex-wrap', $event)"
            :options="[
              { label: '不换行', value: 'nowrap' },
              { label: '换行', value: 'wrap' },
            ]"
          />
        </div>
        <div class="field-row">
          <label>间距</label>
          <StepperInput :model-value="form['gap']" @update:model-value="handleChange('gap', $event)" />
        </div>
      </div>
    </section>

    <!-- 字体 -->
    <section v-if="visibleSections.has('font')" class="panel-section">
      <div class="section-header" @click="toggleSection('font')">
        <span class="section-arrow">{{ collapsed.font ? '▶' : '▼' }}</span>
        <span class="section-title">字体</span>
      </div>
      <div v-show="!collapsed.font" class="section-body">
        <div class="field-row">
          <label>粗细</label>
          <ButtonGroupSelect
            :model-value="form['font-weight']"
            @update:model-value="handleChange('font-weight', $event)"
            :options="[
              { label: '细', value: '300' },
              { label: '正常', value: '400' },
              { label: '粗', value: '700' },
            ]"
          />
        </div>
        <div class="field-row">
          <label>大小</label>
          <StepperInput :model-value="form['font-size']" @update:model-value="handleChange('font-size', $event)" />
        </div>
        <div class="field-row">
          <label>行高</label>
          <StepperInput :model-value="form['line-height']" @update:model-value="handleChange('line-height', $event)" />
        </div>
        <div class="field-row">
          <label>对齐</label>
          <ButtonGroupSelect
            :model-value="form['text-align']"
            @update:model-value="handleChange('text-align', $event)"
            :options="[
              { label: '左', value: 'left' },
              { label: '中', value: 'center' },
              { label: '右', value: 'right' },
              { label: '两端', value: 'justify' },
            ]"
          />
        </div>
        <div class="field-row">
          <label>颜色</label>
          <ColorInput :model-value="form['color']" @update:model-value="handleChange('color', $event)" />
        </div>
      </div>
    </section>

    <!-- 文字装饰 -->
    <section v-if="visibleSections.has('textDecor')" class="panel-section">
      <div class="section-header" @click="toggleSection('textDecor')">
        <span class="section-arrow">{{ collapsed.textDecor ? '▶' : '▼' }}</span>
        <span class="section-title">文字装饰</span>
      </div>
      <div v-show="!collapsed.textDecor" class="section-body">
        <div class="field-row">
          <label>装饰</label>
          <ButtonGroupSelect
            :model-value="form['text-decoration']"
            @update:model-value="handleChange('text-decoration', $event)"
            :options="[
              { label: '无', value: 'none' },
              { label: '下划线', value: 'underline' },
              { label: '删除线', value: 'line-through' },
            ]"
          />
        </div>
        <div class="field-row">
          <label>字距</label>
          <StepperInput :model-value="form['letter-spacing']" :step="0.5" @update:model-value="handleChange('letter-spacing', $event)" />
        </div>
      </div>
    </section>

    <!-- 背景设置 -->
    <section v-if="visibleSections.has('background')" class="panel-section">
      <div class="section-header" @click="toggleSection('background')">
        <span class="section-arrow">{{ collapsed.background ? '▶' : '▼' }}</span>
        <span class="section-title">背景设置</span>
      </div>
      <div v-show="!collapsed.background" class="section-body">
        <div class="field-row">
          <label>填充</label>
          <ButtonGroupSelect
            :model-value="bgMode"
            @update:model-value="setBgMode"
            :options="[
              { label: '无', value: '' },
              { label: '颜色', value: 'color' },
              { label: '图片', value: 'image' },
            ]"
          />
        </div>
        <div v-if="bgMode === 'color'" class="field-row">
          <label>背景色</label>
          <ColorInput :model-value="form['background-color']" @update:model-value="handleChange('background-color', $event)" />
        </div>
        <div v-if="bgMode === 'image'" class="field-row">
          <label>图片</label>
          <input
            type="text"
            class="text-input"
            :value="form['background-image']"
            placeholder="url(...)"
            @input="handleChange('background-image', ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>
    </section>

    <!-- 边框 -->
    <section v-if="visibleSections.has('border')" class="panel-section">
      <div class="section-header" @click="toggleSection('border')">
        <span class="section-arrow">{{ collapsed.border ? '▶' : '▼' }}</span>
        <span class="section-title">边框</span>
      </div>
      <div v-show="!collapsed.border" class="section-body">
        <div class="field-row">
          <label>宽度</label>
          <StepperInput :model-value="form['border-width']" @update:model-value="handleChange('border-width', $event)" />
        </div>
        <div class="field-row">
          <label>样式</label>
          <ButtonGroupSelect
            :model-value="form['border-style']"
            @update:model-value="handleChange('border-style', $event)"
            :options="[
              { label: '无', value: 'none' },
              { label: '实线', value: 'solid' },
              { label: '虚线', value: 'dashed' },
              { label: '点线', value: 'dotted' },
            ]"
          />
        </div>
        <div class="field-row">
          <label>颜色</label>
          <ColorInput :model-value="form['border-color']" @update:model-value="handleChange('border-color', $event)" />
        </div>
        <div class="sub-label">圆角</div>
        <div class="field-row">
          <label>左上</label>
          <StepperInput :model-value="radiusCorners.topLeft" @update:model-value="setRadiusCorner('topLeft', $event)" />
        </div>
        <div class="field-row">
          <label>右上</label>
          <StepperInput :model-value="radiusCorners.topRight" @update:model-value="setRadiusCorner('topRight', $event)" />
        </div>
        <div class="field-row">
          <label>右下</label>
          <StepperInput :model-value="radiusCorners.bottomRight" @update:model-value="setRadiusCorner('bottomRight', $event)" />
        </div>
        <div class="field-row">
          <label>左下</label>
          <StepperInput :model-value="radiusCorners.bottomLeft" @update:model-value="setRadiusCorner('bottomLeft', $event)" />
        </div>
      </div>
    </section>

    <!-- 效果 -->
    <section v-if="visibleSections.has('effect')" class="panel-section">
      <div class="section-header" @click="toggleSection('effect')">
        <span class="section-arrow">{{ collapsed.effect ? '▶' : '▼' }}</span>
        <span class="section-title">效果</span>
      </div>
      <div v-show="!collapsed.effect" class="section-body">
        <div class="field-row">
          <label>透明度</label>
          <div class="slider-wrap">
            <input
              type="range"
              class="slider"
              min="0"
              max="100"
              :value="form['opacity'] !== '' ? Math.round(parseFloat(form['opacity']) * 100) : 100"
              @input="handleChange('opacity', String(($event.target as HTMLInputElement).valueAsNumber / 100))"
            />
            <span class="slider-val">{{ form['opacity'] !== '' ? Math.round(parseFloat(form['opacity']) * 100) : 100 }}%</span>
          </div>
        </div>
        <div class="field-row">
          <label>阴影</label>
          <input
            type="text"
            class="text-input"
            :value="form['box-shadow']"
            placeholder="0 2px 4px rgba(0,0,0,.1)"
            @input="handleChange('box-shadow', ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>
    </section>

    <!-- 自定义属性 -->
    <section v-if="visibleSections.has('custom')" class="panel-section">
      <div class="section-header" @click="toggleSection('custom')">
        <span class="section-arrow">{{ collapsed.custom ? '▶' : '▼' }}</span>
        <span class="section-title">自定义属性</span>
      </div>
      <div v-show="!collapsed.custom" class="section-body">
        <div v-for="(prop, index) in customProps" :key="index" class="custom-row">
          <input
            type="text"
            class="text-input custom-key"
            v-model="prop.key"
            placeholder="属性名"
          />
          <input
            type="text"
            class="text-input custom-val"
            v-model="prop.value"
            placeholder="属性值"
            @change="applyCustomProp(index)"
          />
          <button class="remove-btn" @click="removeCustomProp(index)">×</button>
        </div>
        <button class="add-btn" @click="addCustomProp">+ 添加属性</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.style-panel {
  padding: 0 8px 8px;
}

.panel-section {
  border-bottom: 1px solid #f0f0f0;
}

.panel-section:last-child {
  border-bottom: none;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 4px;
  cursor: pointer;
  user-select: none;
}

.section-header:hover {
  background: #f5f7fa;
}

.section-arrow {
  font-size: 10px;
  color: #909399;
  width: 12px;
}

.section-title {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
}

.section-body {
  padding: 4px 4px 8px 16px;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.field-row > label {
  min-width: 40px;
  font-size: 12px;
  color: #606266;
  flex-shrink: 0;
}

.sub-label {
  font-size: 12px;
  color: #909399;
  margin: 4px 0 2px;
}

.text-input {
  flex: 1;
  height: 24px;
  border: 1px solid #dcdfe6;
  border-radius: 3px;
  font-size: 12px;
  color: #303133;
  padding: 0 6px;
  outline: none;
  min-width: 0;
}

.text-input:focus {
  border-color: #409eff;
}

.text-input::placeholder {
  color: #c0c4cc;
  font-size: 11px;
}

.slider-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.slider {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: #e4e7ed;
  border-radius: 2px;
  outline: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  background: #409eff;
  border-radius: 50%;
  cursor: pointer;
}

.slider-val {
  font-size: 12px;
  color: #606266;
  min-width: 36px;
  text-align: right;
}

.custom-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}

.custom-key {
  width: 80px;
  flex: none;
}

.custom-val {
  flex: 1;
}

.remove-btn {
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: #f56c6c;
  font-size: 14px;
  cursor: pointer;
  flex-shrink: 0;
}

.remove-btn:hover {
  color: #e6363a;
}

.add-btn {
  border: 1px dashed #dcdfe6;
  background: transparent;
  color: #909399;
  font-size: 12px;
  width: 100%;
  height: 26px;
  cursor: pointer;
  border-radius: 3px;
}

.add-btn:hover {
  border-color: #409eff;
  color: #409eff;
}
</style>
