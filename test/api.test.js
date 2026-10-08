import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createApp } from "../server/app.js";
import { createDatabase } from "../server/database.js";

const ticketInput = {
  title: "Internet indisponível na sala",
  description: "O computador não conecta à internet desde hoje cedo.",
  requester: "Ana Lima",
  department: "Suporte",
  category: "rede",
  priority: "alta",
};

async function setup(t) {
  const db = createDatabase(":memory:", { seed: false });
  const app = createApp(db);
  app.listen(0, "127.0.0.1");
  await once(app, "listening");
  t.after(async () => {
    await new Promise((resolve) => app.close(resolve));
    db.close();
  });
  const base = `http://127.0.0.1:${app.address().port}/api`;
  const request = async (path, method = "GET", body) => {
    const response = await fetch(base + path, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    return {
      status: response.status,
      data: response.status === 204 ? null : await response.json(),
    };
  };
  return { db, request, base };
}

test("API cria, consulta, edita, comenta, resolve, reabre e exclui com histórico", async (t) => {
  const { request } = await setup(t);
  let result = await request("/tickets", "POST", ticketInput);
  assert.equal(result.status, 201);
  const id = result.data.id;
  assert.equal(result.data.status, "aberto");
  assert.equal(result.data.events.length, 1);
  assert.equal((await request(`/tickets/${id}`)).data.requester, "Ana Lima");
  result = await request(`/tickets/${id}`, "PUT", {
    ...ticketInput,
    priority: "media",
    title: "Rede da sala está sem conexão",
  });
  assert.equal(result.data.priority, "media");
  result = await request(`/tickets/${id}/comments`, "POST", {
    message: "Cabo de rede verificado. Vamos testar outra porta.",
  });
  assert.equal(result.status, 201);
  assert.equal(result.data.events.at(-1).kind, "comment");
  result = await request(`/tickets/${id}/status`, "PATCH", {
    status: "em_andamento",
  });
  assert.equal(result.data.status, "em_andamento");
  result = await request(`/tickets/${id}/status`, "PATCH", {
    status: "resolvido",
    resolution: "Cabo de rede substituído e conexão testada.",
  });
  assert.equal(result.data.status, "resolvido");
  assert.match(result.data.events.at(-1).message, /Cabo de rede substituído/);
  result = await request(`/tickets/${id}/status`, "PATCH", {
    status: "aberto",
  });
  assert.equal(result.data.resolution, "");
  assert.equal(result.data.events.length, 6);
  assert.equal((await request("/tickets")).data.length, 1);
  assert.equal((await request(`/tickets/${id}`, "DELETE")).status, 204);
  assert.equal((await request(`/tickets/${id}`)).status, 404);
  assert.deepEqual((await request("/tickets")).data, []);
});

test("API rejeita campos, categorias e transições inválidas sem alterar o chamado", async (t) => {
  const { request } = await setup(t);
  for (const input of [
    { ...ticketInput, title: "  " },
    { ...ticketInput, category: "outra" },
    { ...ticketInput, priority: "urgentissima" },
    { ...ticketInput, description: "x".repeat(2001) },
  ]) {
    assert.equal((await request("/tickets", "POST", input)).status, 400);
  }
  const { data: ticket } = await request("/tickets", "POST", ticketInput);
  assert.equal(
    (
      await request(`/tickets/${ticket.id}/status`, "PATCH", {
        status: "resolvido",
        resolution: "Uma solução de teste.",
      })
    ).status,
    409,
  );
  await request(`/tickets/${ticket.id}/status`, "PATCH", {
    status: "em_andamento",
  });
  assert.equal(
    (
      await request(`/tickets/${ticket.id}/status`, "PATCH", {
        status: "resolvido",
        resolution: "   ",
      })
    ).status,
    400,
  );
  assert.equal(
    (await request(`/tickets/${ticket.id}/comments`, "POST", { message: " " }))
      .status,
    400,
  );
  const current = (await request(`/tickets/${ticket.id}`)).data;
  assert.equal(current.status, "em_andamento");
  assert.equal(current.events.length, 2);
  assert.equal((await request("/tickets/9999")).status, 404);
  assert.equal((await request("/tickets/0")).status, 400);
});

test("SQL parametrizado preserva texto e exclusão remove também o histórico", async (t) => {
  const { db, request } = await setup(t);
  const title = "Impressora '; DROP TABLE tickets; --";
  const { data: ticket } = await request("/tickets", "POST", {
    ...ticketInput,
    title,
  });
  assert.equal(ticket.title, title);
  await request(`/tickets/${ticket.id}/comments`, "POST", {
    message: "<script>texto de teste</script>",
  });
  assert.equal(db.get(ticket.id).events.length, 2);
  await request(`/tickets/${ticket.id}`, "DELETE");
  // A tabela continua existindo e o AUTOINCREMENT não reutiliza o ID excluído.
  const next = (await request("/tickets", "POST", ticketInput)).data;
  assert.ok(next.id > ticket.id);
  assert.equal(db.list().length, 1);
  assert.equal(db.get(next.id).events.length, 1);
});

test("API rejeita origem diferente, JSON quebrado e métodos inesperados", async (t) => {
  const { base, request } = await setup(t);
  const blocked = await fetch(`${base}/tickets`, {
    headers: { Origin: "https://outro-site.example" },
  });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.headers.get("access-control-allow-origin"), null);
  const allowed = await fetch(`${base}/tickets`, {
    headers: { Origin: "http://127.0.0.1:5173" },
  });
  assert.equal(
    allowed.headers.get("access-control-allow-origin"),
    "http://127.0.0.1:5173",
  );
  assert.equal(
    (
      await fetch(`${base}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      })
    ).status,
    400,
  );
  assert.equal(
    (await fetch(`${base}/tickets`, { method: "POST", body: "x" })).status,
    415,
  );
  assert.equal((await request("/tickets", "PATCH", {})).status, 405);
});

test("SQLite mantém dados após reabrir o arquivo e não repõe chamados excluídos", () => {
  const directory = mkdtempSync(join(tmpdir(), "chamados-test-"));
  const path = join(directory, "test.sqlite");
  try {
    let db = createDatabase(path);
    assert.equal(db.list().length, 6);
    for (const ticket of db.list()) db.remove(ticket.id);
    const ticket = db.create(ticketInput);
    db.close();
    db = createDatabase(path);
    assert.equal(db.list().length, 1);
    assert.equal(db.get(ticket.id).title, ticketInput.title);
    db.remove(ticket.id);
    db.close();
    db = createDatabase(path);
    assert.deepEqual(db.list(), []);
    db.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
