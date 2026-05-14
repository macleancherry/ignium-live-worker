interface Env {
  DB: D1Database;
  INGEST_TOKEN: string;
}

type IngestDriverRow = {
  sessionId: string;
  subsessionId: string;
  customerId: number;
  driverName: string;
  carNumber: string;
  position: number;
  classPosition: number;
  lap: number;
  lastLap: number | null;
  bestLap: number | null;
  interval: number | null;
  gap: number | null;
  updatedAt: string;
};

type IngestPayload = {
  source: "irsdk";
  capturedAt: string;
  rows: IngestDriverRow[];
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS
    }
  });
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeTime(value: number | null): number | null {
  if (value === null) {
    return null;
  }
  if (!isFiniteNumber(value) || value <= 0 || value >= 1800) {
    return null;
  }
  return Number(value.toFixed(3));
}

function validateRow(row: Partial<IngestDriverRow>): row is IngestDriverRow {
  const customerId = row.customerId;
  const position = row.position;
  const classPosition = row.classPosition;
  const lap = row.lap;

  return (
    typeof row.sessionId === "string" &&
    row.sessionId.length > 0 &&
    typeof row.subsessionId === "string" &&
    row.subsessionId.length > 0 &&
    typeof customerId === "number" &&
    Number.isInteger(customerId) &&
    customerId > 0 &&
    typeof row.driverName === "string" &&
    row.driverName.length > 0 &&
    typeof row.carNumber === "string" &&
    typeof position === "number" &&
    Number.isInteger(position) &&
    position >= 0 &&
    typeof classPosition === "number" &&
    Number.isInteger(classPosition) &&
    classPosition >= 0 &&
    typeof lap === "number" &&
    Number.isInteger(lap) &&
    lap >= 0 &&
    (row.lastLap === null || isFiniteNumber(row.lastLap)) &&
    (row.bestLap === null || isFiniteNumber(row.bestLap)) &&
    (row.interval === null || isFiniteNumber(row.interval)) &&
    (row.gap === null || isFiniteNumber(row.gap)) &&
    typeof row.updatedAt === "string" &&
    row.updatedAt.length > 0
  );
}

async function ingest(env: Env, request: Request): Promise<Response> {
  const auth = request.headers.get("Authorization") || "";
  const expected = `Bearer ${env.INGEST_TOKEN}`;
  if (auth !== expected) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const body = (await request.json()) as Partial<IngestPayload>;
  if (body.source !== "irsdk" || !Array.isArray(body.rows)) {
    return json({ ok: false, error: "invalid_payload" }, 400);
  }

  const rows: IngestDriverRow[] = [];
  for (const rawRow of body.rows) {
    const candidate: Partial<IngestDriverRow> = {
      ...rawRow,
      lastLap: normalizeTime((rawRow as IngestDriverRow).lastLap ?? null),
      bestLap: normalizeTime((rawRow as IngestDriverRow).bestLap ?? null),
      interval: normalizeTime((rawRow as IngestDriverRow).interval ?? null),
      gap: normalizeTime((rawRow as IngestDriverRow).gap ?? null)
    };
    if (!validateRow(candidate)) {
      continue;
    }
    rows.push(candidate);
  }

  if (rows.length === 0) {
    return json({ ok: false, error: "no_valid_rows" }, 400);
  }

  const now = new Date().toISOString();
  const stmt = env.DB.prepare(
    `INSERT INTO live_timing (
      session_id,
      subsession_id,
      customer_id,
      driver_name,
      car_number,
      position,
      class_position,
      lap,
      last_lap,
      best_lap,
      interval_s,
      gap_s,
      updated_at,
      received_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(subsession_id, customer_id) DO UPDATE SET
      session_id=excluded.session_id,
      driver_name=excluded.driver_name,
      car_number=excluded.car_number,
      position=excluded.position,
      class_position=excluded.class_position,
      lap=excluded.lap,
      last_lap=excluded.last_lap,
      best_lap=excluded.best_lap,
      interval_s=excluded.interval_s,
      gap_s=excluded.gap_s,
      updated_at=excluded.updated_at,
      received_at=excluded.received_at`
  );

  const batch = rows.map((row) =>
    stmt.bind(
      row.sessionId,
      row.subsessionId,
      row.customerId,
      row.driverName,
      row.carNumber,
      row.position,
      row.classPosition,
      row.lap,
      row.lastLap,
      row.bestLap,
      row.interval,
      row.gap,
      row.updatedAt,
      now
    )
  );

  await env.DB.batch(batch);

  return json({ ok: true, accepted: rows.length, capturedAt: body.capturedAt ?? now });
}

async function getLive(env: Env, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const subsessionId = url.searchParams.get("subsessionId");

  let query = `SELECT
    session_id as sessionId,
    subsession_id as subsessionId,
    customer_id as customerId,
    driver_name as driverName,
    car_number as carNumber,
    position,
    class_position as classPosition,
    lap,
    last_lap as lastLap,
    best_lap as bestLap,
    interval_s as interval,
    gap_s as gap,
    updated_at as updatedAt,
    received_at as receivedAt
  FROM live_timing`;

  const params: unknown[] = [];
  if (subsessionId) {
    query += " WHERE subsession_id = ?";
    params.push(subsessionId);
  }

  query += " ORDER BY position ASC";

  const rows = await env.DB.prepare(query).bind(...params).all();
  return json({
    ok: true,
    rows: rows.results ?? [],
    count: (rows.results ?? []).length,
    generatedAt: new Date().toISOString()
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const { pathname } = new URL(request.url);

    if (pathname === "/health") {
      return json({ ok: true, service: "ignium-live-api" });
    }

    if (pathname === "/api/live/ingest" && request.method === "POST") {
      return ingest(env, request);
    }

    if (pathname === "/api/live" && request.method === "GET") {
      return getLive(env, request);
    }

    return json({ ok: false, error: "not_found" }, 404);
  }
};
