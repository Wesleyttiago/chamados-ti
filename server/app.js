import { createServer } from "node:http";
import { ValidationError } from "../shared/domain.js";

async function readJson(req) {
  if (!req.headers["content-type"]?.startsWith("application/json"))
    throw new ValidationError("Envie Content-Type: application/json.", 415);
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16384)
      throw new ValidationError("O conteúdo enviado é muito grande.", 413);
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ValidationError("JSON inválido.");
  }
}

export function createApp(
  database,
  { allowedOrigin = "http://127.0.0.1:5173" } = {},
) {
  return createServer(async (req, res) => {
    const send = (status, data) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(status === 204 ? undefined : JSON.stringify(data));
    };
    if (req.headers.origin && req.headers.origin !== allowedOrigin) {
      send(403, { error: "Origem não permitida." });
      return;
    }
    if (req.headers.origin) {
      res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
      res.setHeader("Vary", "Origin");
    }
    if (req.method === "OPTIONS") {
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      );
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      send(204);
      return;
    }
    try {
      const { pathname } = new URL(req.url, "http://localhost");
      if (pathname === "/api/health" && req.method === "GET") {
        send(200, { ok: true, storage: "sqlite" });
        return;
      }
      if (pathname === "/api/tickets") {
        if (req.method === "GET") {
          send(200, database.list());
          return;
        }
        if (req.method === "POST") {
          send(201, database.create(await readJson(req)));
          return;
        }
        throw new ValidationError("Método não permitido.", 405);
      }
      const match = /^\/api\/tickets\/(\d+)(?:\/(status|comments))?$/.exec(
        pathname,
      );
      if (!match) throw new ValidationError("Rota não encontrada.", 404);
      const id = Number(match[1]);
      if (!Number.isSafeInteger(id) || id < 1)
        throw new ValidationError("ID inválido.");
      const action = match[2];
      if (action === "status" && req.method === "PATCH") {
        send(200, database.transition(id, await readJson(req)));
        return;
      }
      if (action === "comments" && req.method === "POST") {
        send(201, database.comment(id, await readJson(req)));
        return;
      }
      if (!action && req.method === "GET") {
        send(200, database.get(id));
        return;
      }
      if (!action && req.method === "PUT") {
        send(200, database.update(id, await readJson(req)));
        return;
      }
      if (!action && req.method === "DELETE") {
        database.remove(id);
        send(204);
        return;
      }
      throw new ValidationError("Método não permitido.", 405);
    } catch (error) {
      if (error instanceof ValidationError)
        send(error.status, { error: error.message });
      else {
        console.error(error);
        send(500, { error: "Erro interno ao acessar o banco de dados." });
      }
    }
  });
}
