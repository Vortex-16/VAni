module.exports = function (api) {
  api.cache(true);
  process.env.EXPO_ROUTER_APP_ROOT = 'app';
  process.env.EXPO_ROUTER_IMPORT_MODE = 'lazy';
  return {
    presets: [["babel-preset-expo", { unstable_transformImportMeta: true }]],
    plugins: [
      "react-native-reanimated/plugin",
    ],
  };
};
