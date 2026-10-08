import test from "node:test";
import assert from "node:assert/strict";
import { createSeed } from "../shared/seed.js";
import { filterTickets, summarize, ticketsToCsv } from "../shared/domain.js";

test("busca ignora acentos e combina categoria, status e prioridade", () => {
  const tickets = createSeed();
  assert.equal(filterTickets(tickets, { query: "RECEPCAO" })[0].id, 101);
  assert.equal(filterTickets(tickets, { query: "#102" })[0].id, 102);
  assert.equal(
    filterTickets(tickets, {
      status: "aberto",
      priority: "media",
      category: "hardware",
    })[0].id,
    103,
  );
  assert.equal(
    filterTickets(tickets, { status: "resolvido", priority: "alta" }).length,
    0,
  );
  assert.equal(
    filterTickets(tickets, { sort: "priority" })[0].priority,
    "alta",
  );
  assert.equal(tickets[0].id, 101);
});

test("resumo calcula os dados atuais e só conta alta prioridade pendente", () => {
  const tickets = createSeed();
  assert.deepEqual(summarize(tickets), {
    total: 6,
    aberto: 2,
    em_andamento: 2,
    resolvido: 2,
    alta: 2,
  });
  tickets[0].status = "resolvido";
  assert.equal(summarize(tickets).alta, 1);
  assert.equal(
    filterTickets(tickets, { priority: "alta", pending: true }).length,
    1,
  );
  assert.deepEqual(summarize([]), {
    total: 0,
    aberto: 0,
    em_andamento: 0,
    resolvido: 0,
    alta: 0,
  });
});

test("CSV mantém acentos e aspas, e trata texto que poderia virar fórmula", () => {
  const ticket = {
    ...createSeed()[0],
    title: '=HYPERLINK("x")',
    requester: 'Ana "Lima"',
  };
  const csv = ticketsToCsv([ticket]);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes('"\'=HYPERLINK(""x"")"'));
  assert.ok(csv.includes('"Ana ""Lima"""'));
  assert.ok(csv.includes("Recepção"));
});
