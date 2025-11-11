//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,

  {
    ignores: [
      'eslint.config.js',
      'prettier.config.js',
      'vite.config.ts',
      'dist/',
      'build/',
      'node_modules/',
      // You can add your other GLOB_EXCLUDE items here too
      '**/.nx/**',
      '**/.svelte-kit/**',
      '**/coverage/**',
      '**/snap/**',
      '**/vite.config.*.timestamp-*.*',
    ],
  },
]
