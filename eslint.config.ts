// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook';

import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import eslintReact from '@eslint-react/eslint-plugin';
import { defineConfig } from 'eslint/config';
import { includeIgnoreFile } from '@eslint/compat';
import { fileURLToPath } from 'node:url';

const gitignorePath = fileURLToPath(new URL('.gitignore', import.meta.url));

export default defineConfig([
  includeIgnoreFile(gitignorePath, 'Imported .gitignore patterns'),
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: { globals: globals.browser },
  },
  tseslint.configs.recommended,
  eslintReact.configs['recommended-typescript'],
  storybook.configs['flat/recommended'],
  {
    // tests/fixtures.ts가 하이드레이션 가드를 위해 page fixture를 재정의하므로,
    // 모든 *.e2e.ts는 '@playwright/test'가 아닌 그 파일에서 test/expect를 가져와야
    // 가드가 실제로 적용된다. 직접 '@playwright/test'에서 가져오면 가드를 우회한 채
    // 통과해버리므로 이를 lint 단계에서 강제한다.
    files: ['tests/**/*.e2e.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@playwright/test',
              importNames: ['test', 'expect'],
              message:
                "'@playwright/test'에서 test/expect를 직접 가져오지 마세요. 하이드레이션 가드가 적용되지 않습니다. 대신 './fixtures'(tests/fixtures.ts)에서 가져오세요.",
            },
          ],
        },
      ],
    },
  },
]);
