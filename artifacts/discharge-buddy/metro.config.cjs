const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Ensure we find expo in the root or local node_modules
const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'expo-router/_ctx') {
    return {
      filePath: path.join(__dirname, '_ctx.local.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
