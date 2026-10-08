export const STATUSES = {
  aberto: "Aberto",
  em_andamento: "Em atendimento",
  resolvido: "Resolvido",
};
export const PRIORITIES = { alta: "Alta", media: "Média", baixa: "Baixa" };
export const CATEGORIES = {
  hardware: "Hardware",
  software: "Software",
  rede: "Rede",
  acesso: "Acesso",
};
export const TRANSITIONS = {
  aberto: ["em_andamento"],
  em_andamento: ["aberto", "resolvido"],
  resolvido: ["aberto"],
};

export class ValidationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function textField(value, label, min, max) {
  if (typeof value !== "string")
    throw new ValidationError(`${label} é obrigatório.`);
  const text = value.trim();
  if (text.length < min || text.length > max)
    throw new ValidationError(
      `${label} deve ter entre ${min} e ${max} caracteres.`,
    );
  return text;
}

export function validateTicket(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new ValidationError("Dados do chamado inválidos.");
  const clean = {
    title: textField(input.title, "Título", 6, 100),
    description: textField(input.description, "Descrição", 10, 2000),
    requester: textField(input.requester, "Solicitante", 3, 60),
    department: textField(input.department, "Setor", 2, 50),
    category: input.category,
    priority: input.priority,
  };
  if (!Object.hasOwn(CATEGORIES, clean.category))
    throw new ValidationError("Categoria inválida.");
  if (!Object.hasOwn(PRIORITIES, clean.priority))
    throw new ValidationError("Prioridade inválida.");
  return clean;
}

export function validateComment(input) {
  return textField(input?.message, "Comentário", 3, 1000);
}

export function validateTransition(ticket, input) {
  const to = input?.status;
  if (!(TRANSITIONS[ticket.status] || []).includes(to))
    throw new ValidationError(
      "Essa mudança de status não está disponível.",
      409,
    );
  const resolution =
    to === "resolvido" ? textField(input.resolution, "Solução", 10, 1000) : "";
  return { status: to, resolution };
}

export function statusMessage(from, to, resolution) {
  return `Status: ${STATUSES[from]} → ${STATUSES[to]}.${resolution ? ` Solução: ${resolution}` : ""}`;
}

export function summarize(tickets) {
  return {
    total: tickets.length,
    aberto: tickets.filter((t) => t.status === "aberto").length,
    em_andamento: tickets.filter((t) => t.status === "em_andamento").length,
    resolvido: tickets.filter((t) => t.status === "resolvido").length,
    alta: tickets.filter(
      (t) => t.priority === "alta" && t.status !== "resolvido",
    ).length,
  };
}

export function normalize(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function filterTickets(
  tickets,
  {
    query = "",
    status = "",
    priority = "",
    category = "",
    sort = "recent",
    pending = false,
  } = {},
) {
  const search = normalize(query.trim());
  const priorities = { alta: 0, media: 1, baixa: 2 };
  return tickets
    .filter(
      (t) =>
        (!status || t.status === status) &&
        (!priority || t.priority === priority) &&
        (!category || t.category === category) &&
        (!pending || t.status !== "resolvido") &&
        (!search ||
          normalize(
            `#${t.id} ${t.title} ${t.requester} ${t.department}`,
          ).includes(search)),
    )
    .sort((a, b) =>
      sort === "priority"
        ? priorities[a.priority] - priorities[b.priority] ||
          b.updatedAt.localeCompare(a.updatedAt)
        : b.updatedAt.localeCompare(a.updatedAt) || b.id - a.id,
    );
}

export function ticketsToCsv(tickets) {
  // O apóstrofo evita que texto digitado seja interpretado como fórmula em planilhas.
  const cell = (value) => {
    let text = String(value ?? "");
    if (/^\s*[=+@\-\t\r\n]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const rows = [
    [
      "ID",
      "Título",
      "Solicitante",
      "Setor",
      "Categoria",
      "Prioridade",
      "Status",
      "Solução",
      "Criado em",
      "Atualizado em",
    ],
    ...tickets.map((t) => [
      t.id,
      t.title,
      t.requester,
      t.department,
      CATEGORIES[t.category],
      PRIORITIES[t.priority],
      STATUSES[t.status],
      t.resolution,
      t.createdAt,
      t.updatedAt,
    ]),
  ];
  return "\uFEFF" + rows.map((row) => row.map(cell).join(";")).join("\r\n");
}
