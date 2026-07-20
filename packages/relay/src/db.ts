import initSqlJs from "sql.js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import type { VoiceboxEvent, Filter } from "./types.js";

let db: any;
let dbPath: string;

export async function initDb(path = "voicebox-relay.db") {
  dbPath = path;
  const SQL = await initSqlJs();

  if (existsSync(path)) {
    const buffer = readFileSync(path);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run("PRAGMA journal_mode = WAL;");

  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      pubkey TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      kind INTEGER NOT NULL,
      content TEXT NOT NULL,
      tags_json TEXT NOT NULL,
      sig TEXT NOT NULL,
      received_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);

  db.run("CREATE INDEX IF NOT EXISTS idx_events_pubkey ON events(pubkey)");
  db.run("CREATE INDEX IF NOT EXISTS idx_events_kind ON events(kind)");
  db.run("CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at)");
  db.run("CREATE INDEX IF NOT EXISTS idx_events_pubkey_kind ON events(pubkey, kind)");

  db.run(`
    CREATE TABLE IF NOT EXISTS event_tags (
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      tag_key TEXT NOT NULL,
      tag_value TEXT NOT NULL,
      PRIMARY KEY (event_id, tag_key, tag_value)
    )
  `);

  db.run("CREATE INDEX IF NOT EXISTS idx_event_tags_key_value ON event_tags(tag_key, tag_value)");

  dedupeVotes();

  saveDb();
}

// One-time cleanup for events stored before vote enforcement existed: a vote
// event's id is derived from its created_at, so refreshing and re-voting
// produced a brand-new, distinct event each time and let one pubkey stuff a
// target with unlimited votes. Keep only the most recent kind-3 vote per
// (pubkey, target).
function dedupeVotes() {
  db.run(`
    DELETE FROM events
    WHERE id IN (
      SELECT e.id
      FROM events e
      JOIN event_tags t ON t.event_id = e.id AND t.tag_key = 'e'
      WHERE e.kind = 3
        AND e.id != (
          SELECT e2.id
          FROM events e2
          JOIN event_tags t2 ON t2.event_id = e2.id AND t2.tag_key = 'e' AND t2.tag_value = t.tag_value
          WHERE e2.pubkey = e.pubkey AND e2.kind = 3
          ORDER BY e2.created_at DESC, e2.rowid DESC
          LIMIT 1
        )
    )
  `);
  db.run(`DELETE FROM event_tags WHERE event_id NOT IN (SELECT id FROM events)`);
}

function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(dbPath, buffer);
}

export function insertEvent(event: VoiceboxEvent): boolean {
  // Check duplicate
  const existing = db.exec("SELECT id FROM events WHERE id = ?", [event.id]);
  if (existing.length > 0 && existing[0].values.length > 0) return false;

  // Votes (kind 3) are single-slot per (pubkey, target): a new vote from the
  // same agent on the same target replaces their prior one instead of
  // stacking, so refreshing and re-voting can't inflate the count.
  if (event.kind === 3) {
    const targetId = event.tags.find((t) => t[0] === "e")?.[1];
    if (targetId) {
      const prior = db.exec(
        `SELECT e.id FROM events e
         JOIN event_tags t ON t.event_id = e.id AND t.tag_key = 'e' AND t.tag_value = ?
         WHERE e.pubkey = ? AND e.kind = 3`,
        [targetId, event.pubkey]
      );
      if (prior.length > 0 && prior[0].values.length > 0) {
        const priorId = prior[0].values[0][0] as string;
        db.run("DELETE FROM event_tags WHERE event_id = ?", [priorId]);
        db.run("DELETE FROM events WHERE id = ?", [priorId]);
      }
    }
  }

  db.run(
    `INSERT INTO events (id, pubkey, created_at, kind, content, tags_json, sig)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      event.id,
      event.pubkey,
      event.created_at,
      event.kind,
      event.content,
      JSON.stringify(event.tags),
      event.sig,
    ]
  );

  for (const tag of event.tags) {
    if (tag.length >= 2) {
      db.run(
        "INSERT OR IGNORE INTO event_tags (event_id, tag_key, tag_value) VALUES (?, ?, ?)",
        [event.id, tag[0], tag[1]]
      );
    }
  }

  saveDb();
  return true;
}

export function queryEvents(filters: Filter[]): VoiceboxEvent[] {
  if (filters.length === 0) return [];

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  for (const filter of filters) {
    const filterConditions: string[] = [];

    if (filter.ids && filter.ids.length > 0) {
      filterConditions.push(
        `id IN (${filter.ids.map(() => "?").join(",")})`
      );
      params.push(...filter.ids);
    }

    if (filter.authors && filter.authors.length > 0) {
      filterConditions.push(
        `pubkey IN (${filter.authors.map(() => "?").join(",")})`
      );
      params.push(...filter.authors);
    }

    if (filter.kinds && filter.kinds.length > 0) {
      filterConditions.push(
        `kind IN (${filter.kinds.map(() => "?").join(",")})`
      );
      params.push(...filter.kinds);
    }

    if (filter.since !== undefined) {
      filterConditions.push("created_at >= ?");
      params.push(filter.since);
    }

    if (filter.until !== undefined) {
      filterConditions.push("created_at <= ?");
      params.push(filter.until);
    }

    for (const [key, values] of Object.entries(filter)) {
      if (key.startsWith("#") && values && values.length > 0) {
        const tagKey = key.slice(1);
        filterConditions.push(
          `id IN (SELECT event_id FROM event_tags WHERE tag_key = ? AND tag_value IN (${values.map(() => "?").join(",")}))`
        );
        params.push(tagKey, ...values);
      }
    }

    if (filterConditions.length > 0) {
      conditions.push(`(${filterConditions.join(" AND ")})`);
    }
  }

  if (conditions.length === 0) return [];

  let sql = `SELECT * FROM events WHERE ${conditions.join(" OR ")} ORDER BY created_at DESC`;

  const limit = filters.find((f) => f.limit !== undefined)?.limit;
  if (limit !== undefined) {
    sql += " LIMIT ?";
    params.push(limit);
  }

  const stmt = db.prepare(sql);
  stmt.bind(params);

  const events: VoiceboxEvent[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    events.push(rowToEvent(row as any));
  }
  stmt.free();

  return events;
}

function rowToEvent(row: any): VoiceboxEvent {
  return {
    id: row.id,
    pubkey: row.pubkey,
    created_at: row.created_at,
    kind: row.kind,
    content: row.content,
    tags: JSON.parse(row.tags_json),
    sig: row.sig,
  };
}

export function getEvent(id: string): VoiceboxEvent | null {
  const stmt = db.prepare("SELECT * FROM events WHERE id = ?");
  stmt.bind([id]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return rowToEvent(row as any);
  }
  stmt.free();
  return null;
}
