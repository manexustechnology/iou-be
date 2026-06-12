# iou-be

Express + TypeScript backend for the IOU app. Bridges the Next.js frontend with the Canton JSON Ledger API v2 running on either a local DAML sandbox or Tenzro devnet.

## Prerequisites

- Node.js 20+
- pnpm
- A running Canton JSON Ledger API v2 on port 7575 (local) — start it with `daml start` inside `daml-example/`

## Setup

```bash
cp .env.example .env
pnpm install
```

### Environment variables (`.env`)

| Variable | Default | Description |
|---|---|---|
| `APP_ENVIRONMENT` | `local` | `local` targets `localhost:7575`; `production` targets Tenzro devnet |
| `PORT` | `4000` | HTTP port the server listens on |
| `CANTON_JWT_SECRET` | `supersecret` | HS256 secret — must match sandbox if auth is enabled |
| `TENZRO_API_KEY` | — | Bearer token for production Tenzro devnet |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |

## Development

```bash
pnpm dev
```

Server starts on `http://localhost:4000` with hot reload via `ts-node-dev`.

## API

All responses follow `{ status, code, message, data }`.

| Method | Path | Header | Description |
|---|---|---|---|
| GET | `/api/parties` | — | List all ledger parties |
| GET | `/api/ious?party=<id>` | — | Active IOUs for a party |
| POST | `/api/ious/issue` | `x-acting-party` | Issue a new IOU (Bank only) |
| POST | `/api/ious/split` | `x-acting-party` | Split an IOU into two |
| POST | `/api/ious/merge` | `x-acting-party` | Merge two IOUs into one |
| POST | `/api/ious/propose-transfer` | `x-acting-party` | Propose ownership transfer |
| GET | `/api/transfers?party=<id>` | — | Pending incoming transfers for a party |
| POST | `/api/transfers/accept` | `x-acting-party` | Accept a transfer |
| POST | `/api/transfers/reject` | `x-acting-party` | Reject a transfer |

## Production

Set `APP_ENVIRONMENT=production` and `TENZRO_API_KEY=<your-key>` in `.env`, then:

```bash
pnpm build
pnpm start
```
