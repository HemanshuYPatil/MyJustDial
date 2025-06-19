const { getDefaultConfig } = require('expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Add 'cjs' to the list of source extensions
defaultConfig.resolver.sourceExts.push('cjs');

// Disable package exports resolution (useful for compatibility issues)
defaultConfig.resolver.unstable_enablePackageExports = false;

module.exports = defaultConfig;
