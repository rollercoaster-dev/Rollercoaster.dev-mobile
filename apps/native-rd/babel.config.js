module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "react-native-unistyles/plugin",
        {
          root: "src",
        },
      ],
      "@babel/plugin-transform-dynamic-import",
      "@babel/plugin-transform-modules-commonjs",
      "@babel/plugin-transform-explicit-resource-management",
    ],
  };
};
