module.exports = ({ config }) => ({
  ...config,
  plugins: [...(config.plugins || []), "./plugins/with-ios-scene-lifecycle.js"],
  ios: {
    ...config.ios,
    ...(process.env.PEER_SPIKE_APPLE_TEAM_ID
      ? { appleTeamId: process.env.PEER_SPIKE_APPLE_TEAM_ID }
      : {}),
  },
});
