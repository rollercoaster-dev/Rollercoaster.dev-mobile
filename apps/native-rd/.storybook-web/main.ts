import { fileURLToPath } from 'url';
import path from 'path';
import type { StorybookConfig } from '@storybook/react-native-web-vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.?(ts|tsx)'],
  viteFinal: async (viteConfig) => ({
    ...viteConfig,
    resolve: {
      ...viteConfig.resolve,
      alias: {
        ...(viteConfig.resolve?.alias as Record<string, string> | undefined),
        '@evolu/react': path.resolve(__dirname, 'mocks/evolu-react.ts'),
        '@evolu/common': path.resolve(__dirname, 'mocks/evolu-common.ts'),
        '@evolu/react-native/expo-sqlite': path.resolve(
          __dirname,
          'mocks/evolu-react-native-expo-sqlite.ts',
        ),
      },
    },
  }),
  framework: {
    name: '@storybook/react-native-web-vite',
    options: {
      modulesToTranspile: [
        'react-native-reanimated',
        'react-native-gesture-handler',
        'react-native-safe-area-context',
        'react-native-screens',
        'react-native-svg',
        'react-native-unistyles',
        '@react-navigation',
        '@rollercoaster-dev/design-tokens',
        'expo-haptics',
        'expo-font',
        'expo-modules-core',
        'expo-secure-store',
        'expo-sqlite',
        'expo-file-system',
        'expo-document-picker',
        'expo-image-picker',
        'expo-camera',
        'expo-video',
        'expo-audio',
        'expo-sharing',
        'expo-status-bar',
      ],
      pluginReactOptions: {
        babel: {
          plugins: [
            ['react-native-unistyles/plugin', { root: 'src' }],
            'react-native-reanimated/plugin',
          ],
        },
      },
    },
  },
  staticDirs: ['../public'],
};

export default config;
