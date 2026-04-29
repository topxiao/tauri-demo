let counter = 0

export function generateNodeId(): string {
  return `node-${Date.now()}-${counter++}`
}

export function resetCounter(): void {
  counter = 0
}
