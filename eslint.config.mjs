import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'
import prettierRecommended from 'eslint-plugin-prettier/recommended'

export default [
  ...nextVitals,
  ...nextTypescript,
  prettierRecommended,
  {
    rules: {
      'react-hooks/incompatible-library': 'off',
    },
  },
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'coverage/**',
      'next-env.d.ts',
    ],
  },
]
