// Share pure business logic (translations, pricing, order statuses) with the web app in ../src/lib.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, "../src/lib")];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")];
config.resolver.extraNodeModules = { "@shared": path.resolve(__dirname, "../src/lib") };
module.exports = config;
