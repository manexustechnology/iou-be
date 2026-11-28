import 'dotenv/config';

export const APP_ENV = process.env.APP_ENVIRONMENT ?? 'local';
export const IS_LOCAL = APP_ENV === 'local';
export const PORT = Number(process.env.PORT ?? 4000);

export const CANTON_BASE_URL = IS_LOCAL
  ? 'http://localhost:7575/v2'
  : 'https://json.devnet.tenzro.network/v2';

export const TENZRO_API_KEY = process.env.TENZRO_API_KEY ?? '';
export const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:3000';

// The HS256 secret is only used to mint ledger tokens when we are not on the
// local sandbox and no Tenzro API key is set. There is no fallback: a
// guessable default would let anyone mint a token for any party.
const rawJwtSecret = process.env.CANTON_JWT_SECRET ?? '';
if (!IS_LOCAL && !TENZRO_API_KEY) {
  if (!rawJwtSecret || rawJwtSecret === 'supersecret') {
    throw new Error(
      'CANTON_JWT_SECRET must be set to a strong secret (or TENZRO_API_KEY set) when APP_ENVIRONMENT is not "local".',
    );
  }
}
export const JWT_SECRET = rawJwtSecret;

// PARTY_API_KEYS maps API keys to the ledger party they may act as.
// Format: "<key>=<partyId>,<key>=<partyId>". The caller's party comes only
// from this map; client-supplied party headers are ignored.
export function parsePartyApiKeys(raw: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of raw.split(',')) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    const key = eq === -1 ? '' : trimmed.slice(0, eq).trim();
    const party = eq === -1 ? '' : trimmed.slice(eq + 1).trim();
    if (!key || !party) {
      throw new Error('PARTY_API_KEYS entries must look like <key>=<partyId>');
    }
    if (key.length < 16) {
      throw new Error('PARTY_API_KEYS keys must be at least 16 characters');
    }
    map.set(key, party);
  }
  return map;
}

export const PARTY_API_KEYS = parsePartyApiKeys(process.env.PARTY_API_KEYS ?? '');
if (PARTY_API_KEYS.size === 0) {
  throw new Error('PARTY_API_KEYS must list at least one <key>=<partyId> pair.');
}
