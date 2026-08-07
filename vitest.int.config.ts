import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.spec.ts'],
    testTimeout: 15000,
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
