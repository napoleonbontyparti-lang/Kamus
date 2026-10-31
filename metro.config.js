// Metro должен знать, что .db — это ассет (база словаря поставляется внутри приложения)
const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push("db");
module.exports = config;
