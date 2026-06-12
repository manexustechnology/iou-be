import jwt from 'jsonwebtoken';
import { IS_LOCAL, JWT_SECRET, TENZRO_API_KEY } from '../config';

// Local Canton sandbox runs without auth — no token needed.
// Production uses the Tenzro API key as Bearer token.
export function makePartyToken(partyId: string): string | null {
  if (IS_LOCAL) return null;
  if (TENZRO_API_KEY) return TENZRO_API_KEY;
  return jwt.sign(
    { 'https://daml.com/ledger-api': { actAs: [partyId], readAs: [partyId] } },
    JWT_SECRET,
    { algorithm: 'HS256' },
  );
}

export function makeAdminToken(): string | null {
  if (IS_LOCAL) return null;
  if (TENZRO_API_KEY) return TENZRO_API_KEY;
  return jwt.sign(
    { 'https://daml.com/ledger-api': { actAs: [], readAs: [], admin: true } },
    JWT_SECRET,
    { algorithm: 'HS256' },
  );
}
