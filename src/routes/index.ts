import { Router } from 'express';
import partiesRouter from './parties';
import iousRouter from './ious';
import transfersRouter from './transfers';
import { requireParty, getActingParty } from '../middleware/auth';

const router = Router();

// Every route needs an API key; the key decides which party the caller is.
router.use(requireParty);

router.get('/me', (_req, res) => {
  res.json({ status: true, code: 200, message: 'ok', data: { party: getActingParty(res) } });
});

router.use('/parties', partiesRouter);
router.use('/ious', iousRouter);
router.use('/transfers', transfersRouter);

export default router;
