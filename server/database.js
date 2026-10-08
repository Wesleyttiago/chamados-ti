import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { createSeed } from "../shared/seed.js";
import {
  ValidationError,
  validateTicket,
  validateComment,
  validateTransition,
  statusMessage,
} from "../shared/domain.js";

export function createDatabase(
  path = "data/chamados.sqlite",
  { seed = true } = {},
) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
  const insert = db.prepare(
    "INSERT INTO tickets (title, description, requester, department, category, priority, status, resolution, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  const insertEvent = db.prepare(
    "INSERT INTO ticket_events (id, ticket_id, kind, message, created_at) VALUES (?, ?, ?, ?, ?)",
  );

  function transaction(action) {
    db.exec("BEGIN");
    try {
      const result = action();
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  function addEvent(id, kind, message, now) {
    insertEvent.run(randomUUID(), id, kind, message, now);
  }
  function shape(row) {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      requester: row.requester,
      department: row.department,
      category: row.category,
      priority: row.priority,
      status: row.status,
      resolution: row.resolution,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      events: db
        .prepare(
          "SELECT id, kind, message, created_at AS createdAt FROM ticket_events WHERE ticket_id = ? ORDER BY created_at, rowid",
        )
        .all(row.id),
    };
  }
  function get(id) {
    const row = db.prepare("SELECT * FROM tickets WHERE id = ?").get(id);
    if (!row) throw new ValidationError("Chamado não encontrado.", 404);
    return shape(row);
  }

  // Só a primeira abertura do arquivo recebe dados fictícios, mesmo se todos forem excluídos depois.
  if (seed && db.prepare("PRAGMA user_version").get().user_version === 0) {
    transaction(() => {
      const seedInsert = db.prepare(
        "INSERT INTO tickets (id, title, description, requester, department, category, priority, status, resolution, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      );
      for (const t of createSeed()) {
        seedInsert.run(
          t.id,
          t.title,
          t.description,
          t.requester,
          t.department,
          t.category,
          t.priority,
          t.status,
          t.resolution,
          t.createdAt,
          t.updatedAt,
        );
        for (const e of t.events)
          insertEvent.run(e.id, t.id, e.kind, e.message, e.createdAt);
      }
      db.exec("PRAGMA user_version = 1");
    });
  }

  return {
    close: () => db.close(),
    get,
    list: () =>
      db
        .prepare("SELECT * FROM tickets ORDER BY updated_at DESC, id DESC")
        .all()
        .map(shape),
    create(input) {
      const t = validateTicket(input);
      return transaction(() => {
        const now = new Date().toISOString();
        const result = insert.run(
          t.title,
          t.description,
          t.requester,
          t.department,
          t.category,
          t.priority,
          "aberto",
          "",
          now,
          now,
        );
        const id = Number(result.lastInsertRowid);
        addEvent(id, "create", "Chamado aberto.", now);
        return get(id);
      });
    },
    update(id, input) {
      get(id);
      const t = validateTicket(input);
      return transaction(() => {
        const now = new Date().toISOString();
        db.prepare(
          "UPDATE tickets SET title = ?, description = ?, requester = ?, department = ?, category = ?, priority = ?, updated_at = ? WHERE id = ?",
        ).run(
          t.title,
          t.description,
          t.requester,
          t.department,
          t.category,
          t.priority,
          now,
          id,
        );
        addEvent(id, "edit", "Dados do chamado atualizados.", now);
        return get(id);
      });
    },
    transition(id, input) {
      const ticket = get(id);
      const fields = validateTransition(ticket, input);
      return transaction(() => {
        const now = new Date().toISOString();
        db.prepare(
          "UPDATE tickets SET status = ?, resolution = ?, updated_at = ? WHERE id = ?",
        ).run(fields.status, fields.resolution, now, id);
        addEvent(
          id,
          "status",
          statusMessage(ticket.status, fields.status, fields.resolution),
          now,
        );
        return get(id);
      });
    },
    comment(id, input) {
      get(id);
      const message = validateComment(input);
      return transaction(() => {
        const now = new Date().toISOString();
        addEvent(id, "comment", message, now);
        db.prepare("UPDATE tickets SET updated_at = ? WHERE id = ?").run(
          now,
          id,
        );
        return get(id);
      });
    },
    remove(id) {
      get(id);
      db.prepare("DELETE FROM tickets WHERE id = ?").run(id);
    },
  };
}
