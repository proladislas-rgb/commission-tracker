import '@testing-library/jest-dom/vitest'

// Node.js 25 exposes a native localStorage object without the full Web Storage API
// (missing clear, setItem, getItem, removeItem). Override it with a proper in-memory mock
// so that jsdom-based tests that use localStorage work correctly.
const _store: Record<string, string> = {}
const localStorageMock: Storage = {
  getItem: (key: string) => _store[key] ?? null,
  setItem: (key: string, value: string) => { _store[key] = String(value) },
  removeItem: (key: string) => { delete _store[key] },
  clear: () => { Object.keys(_store).forEach(k => delete _store[k]) },
  key: (index: number) => Object.keys(_store)[index] ?? null,
  get length() { return Object.keys(_store).length },
}
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
})
