import { describe, expect, it } from 'vitest';

import config from './main';

describe('Storybook Vite config', () => {
  it('removes React Router Vite plugins from the final plugin list', async () => {
    expect(typeof config.viteFinal).toBe('function');

    const finalConfig = await config.viteFinal?.(
      {
        plugins: [
          { name: 'tailwindcss' },
          [
            { name: 'react-router' },
            { name: 'react-router:validate-plugin-order' },
          ],
          { name: 'storybook:code-generator-plugin' },
        ],
      },
      {} as never
    );

    expect(finalConfig?.plugins).toEqual([
      { name: 'tailwindcss' },
      { name: 'storybook:code-generator-plugin' },
    ]);
  });
});
