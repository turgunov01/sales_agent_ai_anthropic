// Значения окружения задаются ДО первого импорта src/config/env.ts.
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test?schema=public";
process.env.JWT_ACCESS_SECRET = "test-access-secret-value-32-characters-min";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-value-32-characters-min";
process.env.ACCESS_TOKEN_TTL = "15m";
process.env.REFRESH_TOKEN_TTL_DAYS = "30";
process.env.ENCRYPTION_KEY = "4f8d2b1a9c7e6350f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708";
process.env.PLATFORM_JWT_SECRET = "test-platform-secret-value-32-characters-min";
process.env.PUBLIC_WEBHOOK_URL = "https://api.test.local";
process.env.WEB_ORIGIN = "http://localhost:3000";
process.env.CONVERSATION_IDLE_HOURS = "24";