import type { DomNode } from '../types'

export interface SimpleSelector {
  type: 'class' | 'id' | 'tag'
  value: string
}

/**
 * Parse a simple CSS selector (`.class`, `#id`, `tagName`) into a SimpleSelector.
 * Returns null for complex/combinator selectors that can't be represented.
 */
export function parseSimpleSelector(selectorText: string): SimpleSelector | null {
  const trimmed = selectorText.trim()
  if (!trimmed) return null

  // Only handle single, simple selectors — no combinators or pseudo-classes
  // Class selector: .foo
  if (/^\.[a-zA-Z_-][a-zA-Z0-9_-]*$/.test(trimmed)) {
    return { type: 'class', value: trimmed.slice(1) }
  }

  // ID selector: #foo
  if (/^#[a-zA-Z_-][a-zA-Z0-9_-]*$/.test(trimmed)) {
    return { type: 'id', value: trimmed.slice(1) }
  }

  // Tag selector: div, span, etc.
  if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(trimmed)) {
    return { type: 'tag', value: trimmed.toLowerCase() }
  }

  return null
}

/**
 * Check if a SimpleSelector matches a DomNode element.
 */
export function selectorMatchesElement(selector: SimpleSelector, element: DomNode): boolean {
  if (element.type !== 'element' || !element.tagName) return false

  switch (selector.type) {
    case 'class': {
      const classAttr = element.attributes?.['class']
      if (!classAttr) return false
      const classes = classAttr.split(/\s+/)
      return classes.includes(selector.value)
    }
    case 'id': {
      return element.attributes?.['id'] === selector.value
    }
    case 'tag': {
      return element.tagName.toLowerCase() === selector.value
    }
    default:
      return false
  }
}

/**
 * Walk a css-tree AST, find all rules whose selectors match the given element.
 * Returns an array of { rule, selectorText, selectors } objects.
 */
export function findMatchingSelectors(element: DomNode, cssAst: any): any[] {
  const results: any[] = []

  if (!cssAst || !cssAst.children) return results

  function walk(node: any): void {
    if (!node) return

    // Rule node (has prelude = selectors, block = declarations)
    if (node.type === 'Rule') {
      const selectorList = node.prelude
      if (selectorList && selectorList.children) {
        const selectorTexts: string[] = []
        let matched = false

        for (const selector of selectorList.children) {
          // Each selector in the list — extract its text
          const selectorText = extractSelectorText(selector)
          selectorTexts.push(selectorText)

          // Try to match using simple selector parsing
          const simple = parseSimpleSelector(selectorText)
          if (simple && selectorMatchesElement(simple, element)) {
            matched = true
          } else {
            // Fallback: try compound selectors (e.g. "div.class")
            if (compoundSelectorMatches(selector, element)) {
              matched = true
            }
          }
        }

        if (matched) {
          results.push({
            rule: node,
            selectorText: selectorTexts.join(', '),
            selectors: selectorList,
          })
        }
      }
    }

    // Atrules may contain nested rules (e.g. @media)
    if (node.type === 'Atrule' && node.block && node.block.children) {
      for (const child of node.block.children) {
        walk(child)
      }
    }

    // StyleSheet or other container nodes
    if (node.children && node.type !== 'Rule' && node.type !== 'Atrule') {
      for (const child of node.children) {
        walk(child)
      }
    }
  }

  for (const child of cssAst.children) {
    walk(child)
  }

  return results
}

/**
 * Extract the text of a selector from a css-tree Selector node.
 */
function extractSelectorText(selectorNode: any): string {
  if (!selectorNode || !selectorNode.children) return ''

  const parts: string[] = []
  for (const child of selectorNode.children) {
    parts.push(extractSelectorPartText(child))
  }
  return parts.join('')
}

function extractSelectorPartText(part: any): string {
  if (!part) return ''

  switch (part.type) {
    case 'TypeSelector':
      return part.name || ''
    case 'ClassSelector':
      return '.' + (part.name || '')
    case 'IdSelector':
      return '#' + (part.name || '')
    case 'AttributeSelector': {
      const name = part.name?.name || part.name || ''
      if (part.matcher && part.value) {
        const val = part.value.value ?? part.value.name ?? part.value
        return `[${name}${part.matcher}${val}]`
      }
      return `[${name}]`
    }
    case 'PseudoClassSelector':
      return ':' + (part.name || '')
    case 'PseudoElementSelector':
      return '::' + (part.name || '')
    case 'Combinator':
      return part.name || ' '
    case 'WhiteSpace':
      return ' '
    case 'SelectorList':
      return part.children
        ? [...part.children].map(extractSelectorText).join(', ')
        : ''
    case 'Selector':
      return extractSelectorText(part)
    case 'NestingSelector':
      return '&'
    default:
      return ''
  }
}

/**
 * Try to match a compound selector (e.g., "div.myclass#myid") against an element.
 * This handles selectors with multiple parts joined without whitespace.
 */
function compoundSelectorMatches(selectorNode: any, element: DomNode): boolean {
  if (!selectorNode || !selectorNode.children) return false
  if (element.type !== 'element' || !element.tagName) return false

  for (const part of selectorNode.children) {
    switch (part.type) {
      case 'TypeSelector': {
        if (element.tagName.toLowerCase() !== (part.name || '').toLowerCase()) {
          return false
        }
        break
      }
      case 'ClassSelector': {
        const classAttr = element.attributes?.['class']
        if (!classAttr) return false
        const classes = classAttr.split(/\s+/)
        if (!classes.includes(part.name)) return false
        break
      }
      case 'IdSelector': {
        if (element.attributes?.['id'] !== part.name) return false
        break
      }
      case 'PseudoClassSelector':
      case 'PseudoElementSelector':
      case 'AttributeSelector':
        // These are complex — skip strict matching, assume match for now
        break
      case 'Combinator':
      case 'WhiteSpace':
        // Combinators mean this is not a simple compound selector
        return false
      default:
        break
    }
  }

  return true
}
