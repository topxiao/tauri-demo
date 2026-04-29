export interface DomNode {
  id: string
  type: 'element' | 'text' | 'comment'
  tagName?: string
  attributes?: Record<string, string>
  textContent?: string
  children?: DomNode[]
  parentId?: string
}

export interface FileEntry {
  name: string
  path: string
  isDir: boolean
  children?: FileEntry[]
}

export interface CssSource {
  type: 'inline' | 'style-tag' | 'external'
  ast: any // css-tree AST
  filePath?: string
  styleTagIndex?: number
}

export interface MatchedRule {
  selector: string
  declarations: Record<string, string>
  source: CssSource
  location?: string
}

export interface Snapshot {
  domTree: DomNode[]
  cssSources: CssSource[]
}

export type PostMessageType = 'highlight' | 'unhighlight' | 'updateStyles' | 'updateStructure' | 'elementClicked' | 'selectionChanged'

export interface IframeMessage {
  type: PostMessageType
  [key: string]: any
}
