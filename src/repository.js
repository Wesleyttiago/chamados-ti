import { createSeed } from "../shared/seed.js";
import {
  validateTicket,
  validateComment,
  validateTransition,
  statusMessage,
} from "../shared/domain.js";

export const STORAGE_KEY = "chamados-ti-v1";
const apiUrl = import.meta.env.VITE_API_URL;
export const isDemo = !apiUrl;

function read() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const data = { version: 1, nextId: 107, tickets: createSeed() };
    write(data);
    return data;
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("Não foi possível ler os dados salvos neste navegador.");
  }
  if (
    data.version !== 1 ||
    !Array.isArray(data.tickets) ||
    !Number.isSafeInteger(data.nextId)
  )
    throw new Error("O formato dos dados salvos não é compatível.");
  return data;
}

function write(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    throw new Error(
      "Não foi possível salvar. Verifique o espaço e a permissão de armazenamento do navegador.",
    );
  }
}

function change(id, mutation) {
  const data = read();
  const ticket = data.tickets.find((t) => t.id === id);
  if (!ticket) throw new Error("Chamado não encontrado.");
  const now = new Date().toISOString();
  mutation(ticket, now);
  ticket.updatedAt = now;
  write(data);
  return ticket;
}

function event(ticket, kind, message, createdAt) {
  ticket.events.push({ id: crypto.randomUUID(), kind, message, createdAt });
}

const browserRepository = {
  async list() {
    return read().tickets;
  },
  async create(input) {
    const fields = validateTicket(input);
    const data = read();
    const now = new Date().toISOString();
    const ticket = {
      ...fields,
      id: data.nextId++,
      status: "aberto",
      resolution: "",
      createdAt: now,
      updatedAt: now,
      events: [],
    };
    event(ticket, "create", "Chamado aberto.", now);
    data.tickets.push(ticket);
    write(data);
    return ticket;
  },
  async update(id, input) {
    const fields = validateTicket(input);
    return change(id, (ticket, now) => {
      Object.assign(ticket, fields);
      event(ticket, "edit", "Dados do chamado atualizados.", now);
    });
  },
  async transition(id, input) {
    return change(id, (ticket, now) => {
      const fields = validateTransition(ticket, input);
      const message = statusMessage(
        ticket.status,
        fields.status,
        fields.resolution,
      );
      Object.assign(ticket, fields);
      event(ticket, "status", message, now);
    });
  },
  async comment(id, input) {
    const message = validateComment(input);
    return change(id, (ticket, now) => event(ticket, "comment", message, now));
  },
  async remove(id) {
    const data = read();
    if (!data.tickets.some((t) => t.id === id))
      throw new Error("Chamado não encontrado.");
    data.tickets = data.tickets.filter((t) => t.id !== id);
    write(data);
  },
};

async function request(path = "", { method = "GET", body } = {}) {
  let response;
  try {
    response = await fetch(`${apiUrl}/tickets${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error(
      "Não foi possível conectar à API. Verifique se o servidor local está rodando.",
    );
  }
  if (response.status === 204) return;
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("A API retornou uma resposta inesperada.");
  }
  if (!response.ok)
    throw new Error(data.error || "Não foi possível concluir a ação.");
  return data;
}

const apiRepository = {
  list: () => request(),
  create: (body) => request("", { method: "POST", body }),
  update: (id, body) => request(`/${id}`, { method: "PUT", body }),
  transition: (id, body) => request(`/${id}/status`, { method: "PATCH", body }),
  comment: (id, body) => request(`/${id}/comments`, { method: "POST", body }),
  remove: (id) => request(`/${id}`, { method: "DELETE" }),
};

export const repository = isDemo ? browserRepository : apiRepository;
