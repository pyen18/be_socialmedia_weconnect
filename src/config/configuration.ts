export default () => ({
  port: parseInt(process.env.PORT || '5002', 10) || 5002,
  database: {
    uri: process.env.MONGO_URI,
  },
  jwt: {
    accessSecret: process.env.ACCESS_TOKEN_SECRET,
    accessTtl: process.env.ACCESS_TOKEN_TTL || '30m',
    refreshTtl:
      parseInt(process.env.REFRESH_TOKEN_TTL || '1209600000', 10) ||
      14 * 24 * 60 * 60 * 1000,
  },
});
