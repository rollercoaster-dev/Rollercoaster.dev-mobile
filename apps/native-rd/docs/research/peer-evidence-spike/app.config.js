module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    ...(process.env.PEER_SPIKE_APPLE_TEAM_ID
      ? { appleTeamId: process.env.PEER_SPIKE_APPLE_TEAM_ID }
      : {}),
  },
});
