import "dotenv/config";

const PLACEHOLDER_SECRETS = new Set([
  "dev_jwt_secret_change_me",
  "diploma_demo_secret_change_for_prod_2026",
  "change_me",
  "secret",
  "",
]);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function loadJwtSecret(): string {
  const secret = requireEnv("JWT_SECRET").trim();
  if (secret.length < 16) {
    throw new Error(
      "JWT_SECRET must be at least 16 characters. " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('base64'))\""
    );
  }
  if (PLACEHOLDER_SECRETS.has(secret) || secret.length < 32) {
    // eslint-disable-next-line no-console
    console.warn(
      "[env] JWT_SECRET looks weak or is a known placeholder — tokens are forge-able if the value is public. " +
        "Rotate to a unique 32+ char value. Continuing boot for compatibility."
    );
  }
  return secret;
}

export const env = {
  PORT: Number(process.env.PORT ?? 3000),
  NODE_ENV: process.env.NODE_ENV ?? "development",
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: loadJwtSecret(),
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL ?? "1h",
  REFRESH_TOKEN_TTL_DAYS: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),
  BCRYPT_ROUNDS: Number(process.env.BCRYPT_ROUNDS ?? 12),
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
  SEED_ON_BOOT: process.env.SEED_ON_BOOT === "true",
};

export const isProd = env.NODE_ENV === "production";
