import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.spec.ts'],
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
