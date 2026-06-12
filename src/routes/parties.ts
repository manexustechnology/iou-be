import { Router } from 'express';
import { adminClient } from '../canton/client';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const response = await adminClient().get<{
      partyDetails: Array<{ party: string; displayName?: string; localMetadata?: { displayName?: string } }>;
    }>('/parties');

    const parties = (response.data.partyDetails ?? []).map((p) => {
      // Canton v2 may return displayName directly or inside localMetadata.
      // Final fallback: extract the hint prefix before '::' from the party ID.
      const displayName =
        p.displayName ||
        p.localMetadata?.displayName ||
        p.party.split('::')[0] ||
        p.party;
      return { party: p.party, displayName };
    });

    res.json({ status: true, code: 200, message: 'ok', data: parties });
  } catch (err) {
    next(err);
  }
});

export default router;
