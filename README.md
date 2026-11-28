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
| `CANTON_JWT_SECRET` | — | HS256 secret used to mint ledger tokens. Required (and must not be `supersecret`) when `APP_ENVIRONMENT` is not `local` and `TENZRO_API_KEY` is unset; the server refuses to start otherwise |
| `TENZRO_API_KEY` | — | Bearer token for production Tenzro devnet |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |
| `PARTY_API_KEYS` | — (required) | `<key>=<partyId>` pairs, comma separated. Each API key acts as exactly one ledger party. Generate keys with `openssl rand -hex 24` (16+ characters) |

## Development

```bash
pnpm dev
```

Server starts on `http://localhost:4000` with hot reload via `ts-node-dev`.

## API

All responses follow `{ status, code, message, data }`.

Every request needs an `x-api-key` header. The server looks the key up in `PARTY_API_KEYS` and acts as that party only. The old `x-acting-party` header is ignored, and `?party=` on the GET routes is optional and must match the key's own party (403 otherwise).

| Method | Path | Description |
|---|---|---|
| GET | `/api/me` | The party this API key acts as |
| GET | `/api/parties` | List all ledger parties |
| GET | `/api/ious` | Active IOUs for the caller's party |
| POST | `/api/ious/issue` | Issue a new IOU (Bank only) |
| POST | `/api/ious/split` | Split an IOU into two |
| POST | `/api/ious/merge` | Merge two IOUs into one |
| POST | `/api/ious/propose-transfer` | Propose ownership transfer |
| GET | `/api/transfers` | Pending incoming transfers for the caller's party |
| POST | `/api/transfers/accept` | Accept a transfer |
| POST | `/api/transfers/reject` | Reject a transfer |

### Demo setup (Bank, Alice, Bob)

1. Start the sandbox and note the three party ids (`daml ledger list-parties`, or the sandbox log).
2. Generate one key per party and put them in `.env`:
   `PARTY_API_KEYS=<bankKey>=Bank::1220...,<aliceKey>=Alice::1220...,<bobKey>=Bob::1220...`
3. In iou-fe, paste a key under **Add API key** to act as that party. Add all three keys in one browser to switch parties from the dropdown, as before.

## Production

Set `APP_ENVIRONMENT=production`, `TENZRO_API_KEY=<your-key>` (or a strong `CANTON_JWT_SECRET`) and `PARTY_API_KEYS` in `.env`, then:

```bash
pnpm build
pnpm start
```
