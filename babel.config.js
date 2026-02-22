module.exports = function (api) {
  api.cache(true);

  const plugins = [];

  // Strip console.log/warn/info in production builds (keep console.error)
  if (process.env.NODE_ENV === 'production' || process.env.BABEL_ENV === 'production') {
    plugins.push([
      'transform-remove-console',
      { exclude: ['error'] },
    ]);
  }

  // react-native-reanimated/plugin must always be last
  plugins.push('react-native-reanimated/plugin');

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
