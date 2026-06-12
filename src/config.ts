import 'dotenv/config';

export const APP_ENV = process.env.APP_ENVIRONMENT ?? 'local';
export const IS_LOCAL = APP_ENV === 'local';
export const PORT = Number(process.env.PORT ?? 4000);

export const CANTON_BASE_URL = IS_LOCAL
  ? 'http://localhost:7575/v2'
  : 'https://json.devnet.tenzro.network/v2';

export const JWT_SECRET = process.env.CANTON_JWT_SECRET ?? 'supersecret';
export const TENZRO_API_KEY = process.env.TENZRO_API_KEY ?? '';
export const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
