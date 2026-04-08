import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./__tests__/setup.ts'],
    include: ['__tests__/**/*.test.ts', '__tests__/**/*.test.tsx'],
    env: {
      AUTH_SECRET: 'test-secret-for-vitest-only-not-for-production',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key-for-vitest-only',
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key-for-vitest-only',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      // server-only is a Next.js guard that throws in non-Next environments
      // Mock it in Vitest so server-side modules can be imported in tests
      'server-only': path.resolve(__dirname, './__tests__/__mocks__/server-only.ts'),
    },
  },
})
