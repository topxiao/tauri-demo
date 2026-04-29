import type { LanguageFn } from 'highlight.js'

/**
 * FreeMarker Template Language (FTL) definition for highlight.js.
 * Handles <#if>, <#list>, <#assign>, <#include>, <#macro>, <#function>,
 * ${...}, <@...>, <#-- ... -->, and standard HTML as base.
 */
const freemarker: LanguageFn = (_hljs) => {
  const FTL_DIRECTIVES = [
    'if', 'else', 'elseif', 'list', 'items', 'sep', 'foreach',
    'assign', 'global', 'local', 'include', 'import', 'macro',
    'nested', 'return', 'function', 'call', 'setting', 'outputformat',
    'autoesc', 'noautoesc', 'compress', 'escape', 'noescape',
    'ftl', 'nt', 'flush', 'stop', 'fallback', 'attempt', 'recover',
    'switch', 'case', 'default', 'break',
  ]

  return {
    name: 'FreeMarker',
    subLanguage: 'xml',
    contains: [
      // FreeMarker comments <#-- ... -->
      {
        className: 'comment',
        begin: '<#--',
        end: '-->',
      },
      // FTL tags <#xxx ...> and </#xxx>
      {
        className: 'keyword',
        begin: '</?#(' + FTL_DIRECTIVES.join('|') + ')\\b',
        end: '/?>',
        contains: [
          {
            className: 'attr',
            begin: '[a-zA-Z_][a-zA-Z0-9_-]*',
            relevance: 0,
          },
          {
            className: 'string',
            begin: '"',
            end: '"',
          },
          {
            className: 'string',
            begin: "'",
            end: "'",
          },
        ],
      },
      // User-defined directive calls <@xxx ...>
      {
        className: 'keyword',
        begin: '<@|</@',
        end: '/?>',
        contains: [
          {
            className: 'attr',
            begin: '[a-zA-Z_][a-zA-Z0-9_.-]*',
          },
          {
            className: 'string',
            begin: '"',
            end: '"',
          },
          {
            className: 'string',
            begin: "'",
            end: "'",
          },
        ],
      },
      // Interpolation ${...}
      {
        className: 'variable',
        begin: '\\$\\{',
        end: '\\}',
        contains: [
          {
            className: 'built_in',
            begin: '\\?[a-zA-Z]+',
          },
        ],
      },
      // [#xxx] square bracket syntax
      {
        className: 'keyword',
        begin: '\\[/?#(' + FTL_DIRECTIVES.join('|') + ')\\b',
        end: '/?\\]',
      },
    ],
  }
}

export default freemarker
