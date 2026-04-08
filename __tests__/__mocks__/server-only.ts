// Mock for 'server-only' package in Vitest.
// In Next.js, this package throws an error if imported in client bundles.
// In tests, we simply allow it — all test code runs server-side.
export {}
