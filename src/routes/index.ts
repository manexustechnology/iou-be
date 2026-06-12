import { Router } from 'express';
import partiesRouter from './parties';
import iousRouter from './ious';
import transfersRouter from './transfers';

const router = Router();

router.use('/parties', partiesRouter);
router.use('/ious', iousRouter);
router.use('/transfers', transfersRouter);

export default router;
