/// <reference types="vite/client" />

declare module 'css-tree' {
  export function parse(source: string, options?: any): any
  export function generate(ast: any, options?: any): string
  export function walk(ast: any, options: any): void
  export function find(ast: any, options: any): any
  export function findAll(ast: any, options: any): any[]
}
