# ignium-live-worker

Cloudflare Worker API for live timing ingest and read queries.

## Endpoints

- `POST /api/live/ingest`
  - Requires `Authorization: Bearer <INGEST_TOKEN>`.
  - Accepts a low-rate payload from the local iRSDK collector.
- `GET /api/live?subsessionId=<id>`
  - Returns current live timing rows ordered by position.
- `GET /health`

## Local setup

1. Install deps: `npm install`
2. Create D1 DB: `wrangler d1 create ignium_live`
3. Copy DB id into `wrangler.jsonc`.
4. Run migration:
   - `wrangler d1 migrations apply ignium_live --local`
5. Start worker:
   - `npm run dev`

## Deploy

1. Apply remote migrations:
   - `wrangler d1 migrations apply ignium_live --remote`
2. Set ingest token:
   - `wrangler secret put INGEST_TOKEN`
3. Deploy:
   - `npm run deploy`
