import { ref } from 'vue'
import type { DomNode } from '../types'

/**
 * Helper script injected into the iframe for element highlighting and click detection.
 * The closing tag uses <\/script> to avoid premature closing in HTML string contexts.
 */
const IFRAME_HELPER_SCRIPT = `<script>
(function() {
  const overlays = new Map();

  function createOverlay(el) {
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.pointerEvents = 'none';
    overlay.style.border = '2px dashed #0066ff';
    overlay.style.backgroundColor = 'rgba(0, 102, 255, 0.15)';
    overlay.style.zIndex = '99999';
    overlay.style.boxSizing = 'border-box';
    const rect = el.getBoundingClientRect();
    overlay.style.top = (rect.top + window.scrollY) + 'px';
    overlay.style.left = (rect.left + window.scrollX) + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
    document.body.appendChild(overlay);
    return overlay;
  }

  function updateOverlayPosition(overlay, el) {
    const rect = el.getBoundingClientRect();
    overlay.style.top = (rect.top + window.scrollY) + 'px';
    overlay.style.left = (rect.left + window.scrollX) + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
  }

  window.addEventListener('message', function(e) {
    if (!e.data || !e.data.type) return;

    if (e.data.type === 'highlight') {
      const nodeId = e.data.nodeId;
      const el = document.querySelector('[data-node-id="' + nodeId + '"]');
      if (el && !overlays.has(nodeId)) {
        overlays.set(nodeId, createOverlay(el));
      }
    }

    if (e.data.type === 'unhighlight') {
      const nodeId = e.data.nodeId;
      const overlay = overlays.get(nodeId);
      if (overlay) {
        overlay.remove();
        overlays.delete(nodeId);
      }
    }
  });

  document.addEventListener('click', function(e) {
    const target = e.target;
    const nodeId = target && target.closest ? target.closest('[data-node-id]') : null;
    if (nodeId) {
      e.preventDefault();
      e.stopPropagation();
      window.parent.postMessage({
        type: 'elementClicked',
        nodeId: nodeId.getAttribute('data-node-id')
      }, '*');
    } else {
      window.parent.postMessage({
        type: 'selectionCleared'
      }, '*');
    }
  }, true);

  window.addEventListener('resize', function() {
    overlays.forEach(function(overlay, nodeId) {
      const el = document.querySelector('[data-node-id="' + nodeId + '"]');
      if (el) {
        updateOverlayPosition(overlay, el);
      }
    });
  });
})();
<\/script>`

export function useIframeSync() {
  const iframeRef = ref<HTMLIFrameElement | null>(null)

  /**
   * Set the iframe element reference for postMessage communication.
   */
  function setIframeRef(el: HTMLIFrameElement | null) {
    iframeRef.value = el
  }

  /**
   * Send a highlight postMessage to the iframe for a specific node.
   */
  function highlight(nodeId: string) {
    iframeRef.value?.contentWindow?.postMessage(
      { type: 'highlight', nodeId },
      '*',
    )
  }

  /**
   * Send an unhighlight postMessage to the iframe for a specific node.
   */
  function unhighlight(nodeId: string) {
    iframeRef.value?.contentWindow?.postMessage(
      { type: 'unhighlight', nodeId },
      '*',
    )
  }

  /**
   * Prepare an HTML string for iframe preview:
   * 1. Inject data-node-id attributes into element tags
   * 2. Append the helper script before </body>
   */
  function prepareHtmlForPreview(html: string, domNodes: DomNode[]): string {
    let result = injectNodeIdsIntoHtml(html, domNodes)

    // Append helper script before </body> (or at the end if no </body>)
    const bodyCloseIndex = result.lastIndexOf('</body>')
    if (bodyCloseIndex !== -1) {
      result =
        result.slice(0, bodyCloseIndex) +
        IFRAME_HELPER_SCRIPT +
        result.slice(bodyCloseIndex)
    } else {
      result += IFRAME_HELPER_SCRIPT
    }

    return result
  }

  return {
    iframeRef,
    setIframeRef,
    highlight,
    unhighlight,
    prepareHtmlForPreview,
  }
}

/**
 * Inject data-node-id attributes into the HTML string for each element node
 * in the DomNode tree. Uses position tracking to avoid replacing wrong tags.
 */
function injectNodeIdsIntoHtml(html: string, domNodes: DomNode[]): string {
  // Build a flat ordered list of (nodeId, tagName) pairs by walking the tree
  // in document order — the same order that parse5 produces AST nodes.
  const nodeQueue: { id: string; tagName: string }[] = []
  collectElementNodes(domNodes, nodeQueue)

  if (nodeQueue.length === 0) return html

  // Walk through the HTML, finding opening tags and injecting data-node-id
  // Use position-based replacement to avoid replacing the wrong tags.
  const tagRegex = /<([a-zA-Z][a-zA-Z0-9]*)\b/g
  const insertions: { position: number; insertion: string }[] = []

  let match: RegExpExecArray | null
  let queueIndex = 0

  while ((match = tagRegex.exec(html)) !== null && queueIndex < nodeQueue.length) {
    const tagLower = match[1].toLowerCase()
    const expected = nodeQueue[queueIndex]

    if (tagLower === expected.tagName.toLowerCase()) {
      // Check if this tag already has data-node-id (skip it)
      const tagEnd = html.indexOf('>', match.index)
      if (tagEnd !== -1) {
        const tagText = html.slice(match.index, tagEnd)
        if (!tagText.includes('data-node-id')) {
          // Insert data-node-id after the tag name
          const insertPos = match.index + match[0].length
          insertions.push({
            position: insertPos,
            insertion: ` data-node-id="${expected.id}"`,
          })
        }
      }
      queueIndex++
    }
  }

  // Apply insertions in reverse order so positions remain valid
  let result = html
  for (let i = insertions.length - 1; i >= 0; i--) {
    const { position, insertion } = insertions[i]
    result = result.slice(0, position) + insertion + result.slice(position)
  }

  return result
}

/**
 * Recursively collect element nodes from the DomNode tree in document order.
 */
function collectElementNodes(
  nodes: DomNode[],
  queue: { id: string; tagName: string }[],
): void {
  for (const node of nodes) {
    if (node.type === 'element' && node.tagName && node.tagName !== '#document') {
      queue.push({ id: node.id, tagName: node.tagName })
      if (node.children) {
        collectElementNodes(node.children, queue)
      }
    } else if (node.children) {
      collectElementNodes(node.children, queue)
    }
  }
}
