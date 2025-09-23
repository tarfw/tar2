const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Simple buffer polyfill for R2 service
config.resolver.alias = {
  ...config.resolver.alias,
  buffer: "@craftzdog/react-native-buffer",
};

module.exports = config;
