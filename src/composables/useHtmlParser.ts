import { parse, serialize } from 'parse5'
import type { DomNode } from '../types'
import { generateNodeId } from '../utils/nodeId'

/**
 * Convert a parse5 AST node (and its children) into our DomNode tree.
 */
function convertNode(astNode: any, parentId?: string): DomNode | null {
  if (!astNode) return null

  // #document / #document-fragment → treat as element container
  if (astNode.nodeName === '#document' || astNode.nodeName === '#document-fragment') {
    const children: DomNode[] = []
    if (astNode.childNodes) {
      for (const child of astNode.childNodes) {
        const converted = convertNode(child, undefined)
        if (converted) {
          if (Array.isArray(converted)) {
            children.push(...converted)
          } else {
            children.push(converted)
          }
        }
      }
    }
    // Document root itself is not a real DomNode — return its children wrapped
    // We return a synthetic container only if there are children
    // But callers expect a flat array, so we'll handle this at the top level
    return {
      id: generateNodeId(),
      type: 'element',
      tagName: '#document',
      children,
    }
  }

  // #text → text node (skip whitespace-only nodes that don't contain newlines)
  if (astNode.nodeName === '#text') {
    const text = astNode.value || ''
    // Skip pure whitespace text that has no newlines (insignificant whitespace)
    if (text.trim() === '' && !text.includes('\n')) {
      return null
    }
    return {
      id: generateNodeId(),
      type: 'text',
      textContent: text,
      parentId,
    }
  }

  // #comment → comment node
  if (astNode.nodeName === '#comment') {
    return {
      id: generateNodeId(),
      type: 'comment',
      textContent: astNode.data || '',
      parentId,
    }
  }

  // Element nodes
  const tagName = astNode.tagName || astNode.nodeName
  const attrs: Record<string, string> = {}
  if (astNode.attrs) {
    for (const attr of astNode.attrs) {
      attrs[attr.name] = attr.value
    }
  }

  const nodeId = generateNodeId()
  const children: DomNode[] = []
  if (astNode.childNodes) {
    for (const child of astNode.childNodes) {
      const converted = convertNode(child, nodeId)
      if (converted) {
        if (Array.isArray(converted)) {
          children.push(...converted)
        } else {
          children.push(converted)
        }
      }
    }
  }

  // Skip void elements' empty children
  const domNode: DomNode = {
    id: nodeId,
    type: 'element',
    tagName,
    attributes: attrs,
    children: children.length > 0 ? children : undefined,
    parentId,
  }

  return domNode
}

/**
 * Convert a DomNode back into a parse5-compatible AST node for serialization.
 */
function domNodeToAst(domNode: DomNode): any {
  // Text node
  if (domNode.type === 'text') {
    return {
      nodeName: '#text',
      value: domNode.textContent || '',
    }
  }

  // Comment node
  if (domNode.type === 'comment') {
    return {
      nodeName: '#comment',
      data: domNode.textContent || '',
    }
  }

  // Element node
  const tagName = domNode.tagName || 'div'
  const attrs: { name: string; value: string }[] = []
  if (domNode.attributes) {
    for (const [name, value] of Object.entries(domNode.attributes)) {
      attrs.push({ name, value })
    }
  }

  const childNodes: any[] = []
  if (domNode.children) {
    for (const child of domNode.children) {
      childNodes.push(domNodeToAst(child))
    }
  }

  return {
    nodeName: tagName,
    tagName,
    attrs,
    childNodes,
  }
}

export function useHtmlParser() {
  /**
   * Parse an HTML string into a DomNode tree using parse5.
   */
  function parseToDomTree(html: string): DomNode[] {
    const ast = parse(html, {
      sourceCodeLocationInfo: true,
    })

    const converted = convertNode(ast)
    if (!converted) return []

    // If the root is a #document container, return its children directly
    if (converted.tagName === '#document') {
      return converted.children || []
    }

    return [converted]
  }

  /**
   * Serialize a DomNode tree back to an HTML string.
   */
  function domTreeToHtml(domNodes: DomNode[]): string {
    // Wrap DomNodes in a fake document fragment for parse5 serialization
    const fragment = {
      nodeName: '#document-fragment',
      childNodes: domNodes.map(domNodeToAst),
    }

    return serialize(fragment as any)
  }

  /**
   * Extract `<style>` tag contents from HTML, returning their index (position)
   * and content string.
   */
  function extractStyleContent(html: string): { index: number; content: string }[] {
    const results: { index: number; content: string }[] = []
    const regex = /<style[^>]*>([\s\S]*?)<\/style>/gi
    let match: RegExpExecArray | null

    while ((match = regex.exec(html)) !== null) {
      results.push({
        index: match.index,
        content: match[1],
      })
    }

    return results
  }

  /**
   * Extract linked CSS file paths from `<link rel="stylesheet">` tags.
   * Resolves relative paths against baseDir.
   */
  function extractExternalCssPaths(html: string, baseDir: string): string[] {
    const paths: string[] = []
    const regex = /<link\s+[^>]*rel\s*=\s*["']stylesheet["'][^>]*>/gi
    let match: RegExpExecArray | null

    while ((match = regex.exec(html)) !== null) {
      const tag = match[0]
      const hrefMatch = tag.match(/href\s*=\s*["']([^"']+)["']/i)
      if (hrefMatch) {
        const href = hrefMatch[1]
        // Resolve relative path against baseDir
        const resolved = resolveCssPath(href, baseDir)
        paths.push(resolved)
      }
    }

    return paths
  }

  return {
    parseToDomTree,
    domTreeToHtml,
    extractStyleContent,
    extractExternalCssPaths,
  }
}

/**
 * Resolve a CSS file path relative to the base directory.
 */
function resolveCssPath(href: string, baseDir: string): string {
  // If absolute path, return as-is
  if (href.startsWith('/') || /^[A-Za-z]:/.test(href)) {
    return href
  }

  // Normalize baseDir — ensure it uses forward slashes
  const normalizedBase = baseDir.replace(/\\/g, '/').replace(/\/$/, '')
  const parts = normalizedBase.split('/')
  const hrefParts = href.split('/')

  for (const part of hrefParts) {
    if (part === '..') {
      parts.pop()
    } else if (part !== '.' && part !== '') {
      parts.push(part)
    }
  }

  return parts.join('/')
}
