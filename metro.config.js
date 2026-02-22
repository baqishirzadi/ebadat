// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add path alias support for @/ to match tsconfig.json
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot);

config.resolver = {
  ...config.resolver,
  alias: {
    '@': path.resolve(projectRoot),
  },
  nodeModulesPaths: [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
  ],
  sourceExts: [...(config.resolver.sourceExts || []), 'mjs', 'cjs'],
};

// Transformer options - simplified for better compatibility
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: false, // Changed to false for better compatibility
    },
  }),
};

module.exports = config;
