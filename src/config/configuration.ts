const required = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

export default () => ({
  port: parseInt(process.env.PORT ?? '5002', 10),
  baseUrl: process.env.baseUrl || 'http://localhost:5002',

  database: {
    uri: required('MONGO_URI'),
  },

  jwt: {
    accessSecret: required('ACCESS_TOKEN_SECRET'),
    accessTtl: process.env.ACCESS_TOKEN_TTL ?? '30m',
    refreshTtl:
      parseInt(process.env.REFRESH_TOKEN_TTL ?? '', 10) ||
      14 * 24 * 60 * 60 * 1000,
  },

  upload: {
    dir: process.env.UPLOAD_DIR ?? './uploads',
    maxFileSize:
      parseInt(process.env.MAX_FILE_SIZE ?? '', 10) || 10 * 1024 * 1024,
    allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') ?? [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ],
  },

  cloudinary: {
    cloudName: required('CLOUDINARY_CLOUD_NAME'),
    apiKey: required('CLOUDINARY_API_KEY'),
    apiSecret: required('CLOUDINARY_API_SECRET'),
  },
});
