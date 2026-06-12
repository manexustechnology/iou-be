import { Router, type Request, type Response, type NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { partyClient } from '../canton/client';

const router = Router();
const TEMPLATE_IOU = '#daml-example:Apps.Iou:Iou';

function getActingParty(req: Request): string {
  const party = req.headers['x-acting-party'] as string | undefined;
  if (!party) throw new Error('Missing x-acting-party header');
  return party;
}

function parseNdjson(raw: string): unknown[] {
  return raw
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as unknown;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

async function getLedgerEnd(party: string): Promise<number> {
  const res = await partyClient(party).get<{ offset: number }>('/state/ledger-end');
  return res.data.offset ?? 0;
}

// GET /api/ious?party=<partyId>
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const party = req.query.party as string | undefined;
    if (!party) {
      res.status(400).json({ status: false, code: 400, message: 'party query param required', data: null });
      return;
    }

    const offset = await getLedgerEnd(party);
    const response = await partyClient(party).post<string>(
      '/state/active-contracts',
      {
        eventFormat: {
          filtersByParty: {
            [party]: {
              cumulative: [{
                identifierFilter: {
                  TemplateFilter: { value: { templateId: TEMPLATE_IOU, includeCreatedEventBlob: false } },
                },
              }],
            },
          },
          verbose: true,
        },
        activeAtOffset: offset,
      },
      { responseType: 'text' },
    );

    // Canton v2 returns a JSON array (possibly across one line), not true NDJSON.
    // Each element: { contractEntry: { JsActiveContract: { createdEvent: {...} } } }
    const parsed = parseNdjson(response.data);
    const entries: unknown[] = parsed.flatMap((line) => Array.isArray(line) ? line : [line]);

    const contracts = entries
      .map((obj) => {
        const o = obj as Record<string, unknown>;
        const jsActive = (o.contractEntry as Record<string, unknown> | undefined)
          ?.JsActiveContract as Record<string, unknown> | undefined;
        const event = jsActive?.createdEvent as Record<string, unknown> | undefined;
        if (!event) return null;
        const args = (event.createArgument ?? {}) as Record<string, string>;
        return {
          contractId: event.contractId as string,
          issuer: args.issuer,
          owner: args.owner,
          amount: args.amount,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    res.json({ status: true, code: 200, message: 'ok', data: contracts });
  } catch (err) {
    next(err);
  }
});

// POST /api/ious/issue
router.post('/issue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actingParty = getActingParty(req);
    const { issuer, owner, amount } = req.body as { issuer: string; owner: string; amount: string };

    const response = await partyClient(actingParty).post('/commands/submit-and-wait-for-transaction', {
      commands: {
        commands: [
          {
            CreateCommand: {
              templateId: TEMPLATE_IOU,
              createArguments: { issuer, owner, amount: String(amount) },
            },
          },
        ],
        userId: 'iou-app',
        commandId: randomUUID(),
        actAs: [actingParty],
        readAs: [],
      },
    });

    const data = response.data as Record<string, unknown>;
    const txId = (data.transaction as Record<string, string> | undefined)?.updateId ?? (data.updateId as string) ?? '';
    res.json({ status: true, code: 200, message: 'IOU issued', data: { transactionId: txId } });
  } catch (err) {
    next(err);
  }
});

async function exerciseIou(
  actingParty: string,
  contractId: string,
  choice: string,
  choiceArgument: Record<string, unknown>,
): Promise<string> {
  const response = await partyClient(actingParty).post('/commands/submit-and-wait-for-transaction', {
    commands: {
      commands: [
        {
          ExerciseCommand: {
            templateId: TEMPLATE_IOU,
            contractId,
            choice,
            choiceArgument,
          },
        },
      ],
      userId: 'iou-app',
      commandId: randomUUID(),
      actAs: [actingParty],
      readAs: [],
    },
  });
  const data = response.data as Record<string, unknown>;
  return (data.transaction as Record<string, string> | undefined)?.updateId ?? (data.updateId as string) ?? '';
}

// POST /api/ious/split
router.post('/split', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actingParty = getActingParty(req);
    const { contractId, splitAmount } = req.body as { contractId: string; splitAmount: string };
    const txId = await exerciseIou(actingParty, contractId, 'Split', { splitAmount: String(splitAmount) });
    res.json({ status: true, code: 200, message: 'Split successful', data: { transactionId: txId } });
  } catch (err) {
    next(err);
  }
});

// POST /api/ious/merge
router.post('/merge', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actingParty = getActingParty(req);
    const { contractId, otherContractId } = req.body as { contractId: string; otherContractId: string };
    const txId = await exerciseIou(actingParty, contractId, 'Merge', { otherCid: otherContractId });
    res.json({ status: true, code: 200, message: 'Merge successful', data: { transactionId: txId } });
  } catch (err) {
    next(err);
  }
});

// POST /api/ious/propose-transfer
router.post('/propose-transfer', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actingParty = getActingParty(req);
    const { contractId, newOwner } = req.body as { contractId: string; newOwner: string };
    const txId = await exerciseIou(actingParty, contractId, 'ProposeTransfer', { newOwner });
    res.json({ status: true, code: 200, message: 'Transfer proposed', data: { transactionId: txId } });
  } catch (err) {
    next(err);
  }
});

export default router;
