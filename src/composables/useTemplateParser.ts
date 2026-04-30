import { parse, serialize } from 'parse5'
import type { DomNode } from '../types'
import { useHtmlParser } from './useHtmlParser'

function matchSelector(astNode: any, selector: string): boolean {
  if (!astNode.attrs && !astNode.tagName) return false
  if (selector.startsWith('#')) {
    const id = selector.slice(1)
    return astNode.attrs?.some((a: any) => a.name === 'id' && a.value === id)
  }
  if (selector.startsWith('.')) {
    const cls = selector.slice(1)
    return astNode.attrs?.some(
      (a: any) => a.name === 'class' && a.value.split(/\s+/).includes(cls),
    )
  }
  return astNode.tagName === selector.toLowerCase()
}

function findElementBySelector(astNode: any, selector: string): any | null {
  if (astNode.tagName && matchSelector(astNode, selector)) return astNode
  if (astNode.childNodes) {
    for (const child of astNode.childNodes) {
      const found = findElementBySelector(child, selector)
      if (found) return found
    }
  }
  return null
}

function rewriteAstUrls(astNode: any, baseUrl: string): void {
  if (astNode.attrs) {
    for (const attr of astNode.attrs) {
      if ((attr.name === 'src' || attr.name === 'href') && attr.value) {
        const val = attr.value
        if (
          !val.startsWith('http') &&
          !val.startsWith('/') &&
          !val.startsWith('data:') &&
          !val.startsWith('#') &&
          !val.startsWith('javascript:')
        ) {
          attr.value = baseUrl + '/' + val
        }
      }
    }
  }
  if (astNode.childNodes) {
    for (const child of astNode.childNodes) {
      rewriteAstUrls(child, baseUrl)
    }
  }
}

export function useTemplateParser() {
  function extractComponent(html: string, selector: string): string | null {
    const ast = parse(html)
    const element = findElementBySelector(ast, selector)
    if (!element) return null
    return serialize(element)
  }

  function rewriteUrls(html: string, baseUrl: string): string {
    const ast = parse(html)
    rewriteAstUrls(ast, baseUrl)
    return serialize(ast)
  }

  function htmlToDomNodes(html: string, parentId: string | null = null): DomNode[] {
    const { parseToDomTree } = useHtmlParser()
    const nodes = parseToDomTree(html)
    function assignParent(ns: DomNode[], pid: string | null) {
      for (const node of ns) {
        node.parentId = pid ?? undefined
        if (node.children) assignParent(node.children, node.id)
      }
    }
    assignParent(nodes, parentId)
    return nodes
  }

  return { extractComponent, rewriteUrls, htmlToDomNodes }
}
