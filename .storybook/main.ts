import type { StorybookConfig } from '@storybook/react-vite';

const flattenPlugins = (plugins: unknown[]): unknown[] =>
  plugins.flatMap((plugin) =>
    Array.isArray(plugin) ? flattenPlugins(plugin) : [plugin]
  );

const isReactRouterPlugin = (plugin: unknown): boolean => {
  if (!plugin || typeof plugin !== 'object') {
    return false;
  }

  if (!('name' in plugin) || typeof plugin.name !== 'string') {
    return false;
  }

  return plugin.name.startsWith('react-router');
};

const config: StorybookConfig = {
  stories: [
    '../stories/**/*.mdx',
    '../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-vitest',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    'storybook-addon-remix-react-router',
  ],
  framework: '@storybook/react-vite',
  viteFinal: async (config) => ({
    ...config,
    plugins: flattenPlugins(config.plugins ?? []).filter(
      (plugin) => !isReactRouterPlugin(plugin)
    ),
  }),
};
export default config;
