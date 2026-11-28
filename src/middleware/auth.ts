import { createHash, timingSafeEqual } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { PARTY_API_KEYS } from '../config';

const sha256 = (value: string) => createHash('sha256').update(value).digest();

const KEY_HASHES = Array.from(PARTY_API_KEYS.entries()).map(([key, party]) => ({
  hash: sha256(key),
  party,
}));

function partyForKey(key: string): string | null {
  const candidate = sha256(key);
  let match: string | null = null;
  for (const entry of KEY_HASHES) {
    if (timingSafeEqual(candidate, entry.hash)) match = entry.party;
  }
  return match;
}

// Resolves the caller's ledger party from the x-api-key header.
// The x-acting-party header is never read.
export function requireParty(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers['x-api-key'];
  const key = typeof header === 'string' ? header.trim() : '';
  const party = key ? partyForKey(key) : null;
  if (!party) {
    res.status(401).json({ status: false, code: 401, message: 'Missing or invalid x-api-key', data: null });
    return;
  }
  res.locals.party = party;
  next();
}

export function getActingParty(res: Response): string {
  const party = res.locals.party as string | undefined;
  if (!party) throw new Error('Unauthenticated request reached a party route');
  return party;
}

// GET routes used to take ?party=. Keep accepting it so existing clients work,
// but only when it names the caller's own party.
export function resolveQueryParty(req: Request, res: Response): string | null {
  const party = getActingParty(res);
  const requested = req.query.party;
  if (requested !== undefined && requested !== party) {
    res.status(403).json({ status: false, code: 403, message: 'You can only read your own party', data: null });
    return null;
  }
  return party;
}
