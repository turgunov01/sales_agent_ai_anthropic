/**
 * PM2 для развёртывания без Docker (Ubuntu VPS).
 *   API_PORT=4010 WEB_PORT=4011 pm2 start ecosystem.config.cjs --env production
 *   pm2 reload ecosystem.config.cjs   # перезапуск без простоя
 *
 * Порт API берётся из .env (PORT) — pm2 его не переопределяет.
 * Nuxt-сборка .env не читает, поэтому её порт задаётся здесь через WEB_PORT.
 */
const WEB_PORT = process.env.WEB_PORT || 3000;

module.exports = {
  apps: [
    {
      name: "ai-sales-api",
      cwd: "./apps/api",
      script: "dist/main.js",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      autorestart: true,
      env: { NODE_ENV: "development" },
      env_production: { NODE_ENV: "production" },
      error_file: "../../logs/api-error.log",
      out_file: "../../logs/api-out.log",
      time: true,
    },
    {
      name: "ai-sales-web",
      cwd: "./apps/web",
      script: ".output/server/index.mjs",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      autorestart: true,
      env: { NODE_ENV: "development", NITRO_PORT: WEB_PORT, NITRO_HOST: "127.0.0.1" },
      env_production: { NODE_ENV: "production", NITRO_PORT: WEB_PORT, NITRO_HOST: "127.0.0.1" },
      error_file: "../../logs/web-error.log",
      out_file: "../../logs/web-out.log",
      time: true,
    },
  ],
};