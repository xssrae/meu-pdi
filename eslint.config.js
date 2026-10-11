import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// Cores vêm só dos tokens (ADR-005): nenhum hex literal no código da interface.
const HEX = '#[0-9A-Fa-f]{3,8}\\b'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'test-results', 'playwright-report'] },
  {
    files: ['**/*.{ts,tsx,js}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2023, globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ['src/web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-restricted-syntax': [
        'error',
        {
          selector: `Literal[value=/${HEX}/]`,
          message: 'Use um token do design system (tokens.css / tones.ts), não um hex.',
        },
        {
          selector: `TemplateElement[value.raw=/${HEX}/]`,
          message: 'Use um token do design system (tokens.css / tones.ts), não um hex.',
        },
      ],
    },
  },
)
