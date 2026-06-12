import { Router, type Request, type Response, type NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { partyClient } from '../canton/client';

const router = Router();
const TEMPLATE_TRANSFER = '#daml-example:Apps.Iou:IouTransfer';

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

// GET /api/transfers?party=<partyId>
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
                  TemplateFilter: { value: { templateId: TEMPLATE_TRANSFER, includeCreatedEventBlob: false } },
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

    const parsed = parseNdjson(response.data);
    const entries: unknown[] = parsed.flatMap((line) => Array.isArray(line) ? line : [line]);

    const transfers = entries
      .map((obj) => {
        const o = obj as Record<string, unknown>;
        const jsActive = (o.contractEntry as Record<string, unknown> | undefined)
          ?.JsActiveContract as Record<string, unknown> | undefined;
        const event = jsActive?.createdEvent as Record<string, unknown> | undefined;
        if (!event) return null;
        const args = (event.createArgument ?? {}) as Record<string, unknown>;
        const iou = (args.iou ?? {}) as Record<string, string>;
        return {
          contractId: event.contractId as string,
          iou: {
            issuer: iou.issuer,
            owner: iou.owner,
            amount: iou.amount,
          },
          newOwner: args.newOwner as string,
        };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null)
      .filter((t) => t.newOwner === party);

    res.json({ status: true, code: 200, message: 'ok', data: transfers });
  } catch (err) {
    next(err);
  }
});

async function exerciseTransfer(
  actingParty: string,
  contractId: string,
  choice: 'AcceptTransfer' | 'RejectTransfer',
): Promise<string> {
  const response = await partyClient(actingParty).post('/commands/submit-and-wait-for-transaction', {
    commands: {
      commands: [
        {
          ExerciseCommand: {
            templateId: TEMPLATE_TRANSFER,
            contractId,
            choice,
            choiceArgument: {},
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

// POST /api/transfers/accept
router.post('/accept', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actingParty = getActingParty(req);
    const { transferContractId } = req.body as { transferContractId: string };
    const txId = await exerciseTransfer(actingParty, transferContractId, 'AcceptTransfer');
    res.json({ status: true, code: 200, message: 'Transfer accepted', data: { transactionId: txId } });
  } catch (err) {
    next(err);
  }
});

// POST /api/transfers/reject
router.post('/reject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actingParty = getActingParty(req);
    const { transferContractId } = req.body as { transferContractId: string };
    const txId = await exerciseTransfer(actingParty, transferContractId, 'RejectTransfer');
    res.json({ status: true, code: 200, message: 'Transfer rejected', data: { transactionId: txId } });
  } catch (err) {
    next(err);
  }
});

export default router;
