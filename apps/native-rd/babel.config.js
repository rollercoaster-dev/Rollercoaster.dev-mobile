module.exports = function (api) {
  // Invalidate the babel cache when NODE_ENV changes so the test-mode gate
  // below (which strips the unistyles plugin) takes effect deterministically.
  api.cache.using(() => process.env.NODE_ENV);

  const isTest = api.env("test") || process.env.NODE_ENV === "test";

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      !isTest && [
        "react-native-unistyles/plugin",
        {
          root: "src",
        },
      ],
      "@babel/plugin-transform-dynamic-import",
      "@babel/plugin-transform-modules-commonjs",
      "@babel/plugin-transform-explicit-resource-management",
    ].filter(Boolean),
  };
};
