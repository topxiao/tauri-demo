import { invoke } from '@tauri-apps/api/core'
import type { DomNode, CssSource, MatchedRule } from '../types'
import { findMatchingSelectors } from '../utils/selectorMatcher'

export function useCssEditor() {
  /**
   * Parse a node's inline style attribute string into key-value pairs.
   */
  function parseInlineStyles(node: DomNode): Record<string, string> {
    const styleStr = node.attributes?.['style']
    if (!styleStr) return {}

    const styles: Record<string, string> = {}
    const declarations = styleStr.split(';')

    for (const decl of declarations) {
      const trimmed = decl.trim()
      if (!trimmed) continue
      const colonIndex = trimmed.indexOf(':')
      if (colonIndex === -1) continue

      const property = trimmed.slice(0, colonIndex).trim()
      const value = trimmed.slice(colonIndex + 1).trim()
      if (property) {
        styles[property] = value
      }
    }

    return styles
  }

  /**
   * Serialize key-value style pairs back to a style attribute string.
   */
  function serializeInlineStyles(styles: Record<string, string>): string {
    return Object.entries(styles)
      .map(([prop, val]) => `${prop}: ${val}`)
      .join('; ')
  }

  /**
   * Parse CSS content string into a css-tree AST.
   * Uses dynamic import because css-tree is ESM-only.
   */
  async function parseStyleTagCss(content: string): Promise<any> {
    const csstree = await import('css-tree')
    return csstree.parse(content)
  }

  /**
   * Read an external CSS file via Tauri invoke and parse it to a css-tree AST.
   */
  async function parseExternalCss(filePath: string): Promise<any> {
    const content = await invoke<string>('read_file', { filePath })
    const csstree = await import('css-tree')
    return csstree.parse(content)
  }

  /**
   * Find all matching CSS rules for an element across multiple CssSource objects.
   */
  async function findAllMatches(
    element: DomNode,
    sources: CssSource[],
  ): Promise<MatchedRule[]> {
    const rules: MatchedRule[] = []

    for (const source of sources) {
      if (!source.ast) continue

      const matches = findMatchingSelectors(element, source.ast)

      for (const match of matches) {
        // Extract declarations from the rule's block
        const declarations = extractDeclarations(match.rule)

        let location = ''
        if (source.type === 'inline') {
          location = 'inline'
        } else if (source.type === 'style-tag') {
          location = `style-tag[${source.styleTagIndex ?? -1}]`
        } else if (source.type === 'external') {
          location = source.filePath || 'external'
        }

        rules.push({
          selector: match.selectorText,
          declarations,
          source,
          location,
        })
      }
    }

    return rules
  }

  /**
   * Update an existing CSS declaration value in a css-tree AST.
   */
  async function updateDeclaration(
    cssAst: any,
    selector: string,
    property: string,
    newValue: string,
  ): Promise<void> {
    const csstree = await import('css-tree')
    const rule = findRuleBySelector(cssAst, selector)

    if (!rule || !rule.block || !rule.block.children) return

    csstree.walk(rule.block, {
      visit: 'Declaration',
      enter(node: any) {
        if (node.property === property) {
          node.value = {
            type: 'Value',
            children: [
              {
                type: 'Identifier',
                name: newValue,
              },
            ],
          }
        }
      },
    })
  }

  /**
   * Add a new declaration to a rule matching the given selector.
   * If no rule matches, creates a new rule.
   */
  async function addDeclaration(
    cssAst: any,
    selector: string,
    property: string,
    value: string,
  ): Promise<void> {
    const csstree = await import('css-tree')
    const rule = findRuleBySelector(cssAst, selector)

    if (rule && rule.block && rule.block.children) {
      // Add new declaration to existing rule
      rule.block.children.push({
        type: 'Declaration',
        property,
        important: false,
        value: {
          type: 'Value',
          children: [
            {
              type: 'Identifier',
              name: value,
            },
          ],
        },
      })
    } else {
      // Create a new rule
      const newRule = csstree.parse(`${selector} { ${property}: ${value}; }`, {
        context: 'rule',
      })
      if (cssAst.children) {
        cssAst.children.push(newRule)
      }
    }
  }

  /**
   * Remove a declaration from a rule matching the given selector.
   */
  async function removeDeclaration(
    cssAst: any,
    selector: string,
    property: string,
  ): Promise<void> {
    const rule = findRuleBySelector(cssAst, selector)
    if (!rule || !rule.block || !rule.block.children) return

    // Filter out the matching declaration
    const filtered = rule.block.children.filter(
      (decl: any) => !(decl.type === 'Declaration' && decl.property === property),
    )
    rule.block.children = filtered
  }

  /**
   * Serialize a css-tree AST back to a CSS string.
   */
  async function serializeCss(ast: any): Promise<string> {
    const csstree = await import('css-tree')
    return csstree.generate(ast)
  }

  return {
    parseInlineStyles,
    serializeInlineStyles,
    parseStyleTagCss,
    parseExternalCss,
    findAllMatches,
    updateDeclaration,
    addDeclaration,
    removeDeclaration,
    serializeCss,
  }
}

/**
 * Extract property: value pairs from a css-tree Rule node's block.
 */
function extractDeclarations(rule: any): Record<string, string> {
  const decls: Record<string, string> = {}

  if (!rule?.block?.children) return decls

  for (const child of rule.block.children) {
    if (child.type === 'Declaration') {
      const valueText = extractDeclarationValue(child.value)
      decls[child.property] = valueText
    }
  }

  return decls
}

/**
 * Extract the text value from a css-tree Value node.
 */
function extractDeclarationValue(valueNode: any): string {
  if (!valueNode) return ''
  if (!valueNode.children) return ''

  const parts: string[] = []
  for (const child of valueNode.children) {
    parts.push(extractValuePartText(child))
  }
  return parts.join('')
}

function extractValuePartText(node: any): string {
  if (!node) return ''

  switch (node.type) {
    case 'Identifier':
      return node.name || ''
    case 'Number':
      return node.value || ''
    case 'Percentage':
      return (node.value || '') + '%'
    case 'Dimension':
      return (node.value || '') + (node.unit || '')
    case 'String':
      return node.value || ''
    case 'Url':
      return `url(${node.value || ''})`
    case 'Function': {
      const name = node.name || ''
      const args = node.children
        ? [...node.children].map(extractValuePartText).join('')
        : ''
      return `${name}(${args})`
    }
    case 'Operator':
      return node.value || ''
    case 'WhiteSpace':
      return ' '
    case 'Separator':
      return ', '
    default:
      return ''
  }
}

/**
 * Find a css-tree Rule node whose selector matches the given selector text.
 */
function findRuleBySelector(cssAst: any, selectorText: string): any | null {
  if (!cssAst?.children) return null

  for (const child of cssAst.children) {
    if (child.type === 'Rule') {
      const selectorString = extractRuleSelectorText(child)
      if (selectorString === selectorText) {
        return child
      }
    }
  }

  return null
}

/**
 * Extract the full selector text from a css-tree Rule node.
 */
function extractRuleSelectorText(rule: any): string {
  if (!rule?.prelude?.children) return ''

  const parts: string[] = []
  for (const selector of rule.prelude.children) {
    if (selector.children) {
      const selectorParts: string[] = []
      for (const part of selector.children) {
        selectorParts.push(extractSelectorPartText(part))
      }
      parts.push(selectorParts.join(''))
    }
  }
  return parts.join(', ')
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
    case 'NestingSelector':
      return '&'
    default:
      return ''
  }
}
