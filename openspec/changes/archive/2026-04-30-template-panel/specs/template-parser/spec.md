# template-parser

## 需求

### REQ-1: 按选择器提取组件

`extractComponent(html: string, selector: string): string | null`

用 parse5 解析 HTML，遍历 AST 找到第一个匹配选择器的元素，序列化该元素及其子树为 HTML 字符串返回。

支持的选择器类型：
- `.classname`：匹配 class 属性包含该值的元素
- `#id`：匹配 id 属性等于该值的元素
- `tagname`：匹配标签名等于该值的元素

未找到匹配元素时返回 null。

### REQ-2: URL 重写

`rewriteUrls(html: string, baseUrl: string): string`

遍历 HTML 中所有元素的 `src` 和 `href` 属性，将相对路径重写为绝对路径。

重写规则：如果属性值不以 `http`、`/`、`data:`、`#`、`javascript:` 开头，则替换为 `baseUrl + '/' + 原值`。

### REQ-3: HTML 片段转 DomNode 树

`htmlToDomNodes(html: string, parentId: string | null): DomNode[]`

将 HTML 字符串解析为 DomNode[] 树，为每个节点分配新的 UUID。复用 useHtmlParser 的 parseToDomTree 方法。

## 验收标准

- `extractComponent(html, '.login-form')` 返回 `.login-form` 元素及其子树的 HTML
- `rewriteUrls('<img src="images/bg.jpg">', 'https://example.com')` 返回 `<img src="https://example.com/images/bg.jpg">`
- 已是完整 URL 的路径不被修改
- `htmlToDomNodes` 返回的 DomNode 树有独立的 ID
