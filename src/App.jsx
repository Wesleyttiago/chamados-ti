import { useEffect, useMemo, useRef, useState } from "react";
import { repository, isDemo, STORAGE_KEY } from "./repository.js";
import {
  CATEGORIES,
  PRIORITIES,
  STATUSES,
  filterTickets,
  summarize,
  ticketsToCsv,
} from "../shared/domain.js";
import { Icon } from "./icons.jsx";

const emptyFilters = {
  query: "",
  status: "",
  priority: "",
  category: "",
  sort: "recent",
  pending: false,
};
const shortDate = (value) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(
    new Date(value),
  );
const fullDate = (value) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
const initials = (name) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

function Badge({ type, value }) {
  const labels = type === "status" ? STATUSES : PRIORITIES;
  return (
    <span className={`badge ${type}-${value}`}>
      <span className="badge-dot" />
      {labels[value]}
    </span>
  );
}

function Dialog({ title, children, onClose, className = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${className}`}
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="dialog-head">
        <h2 id="dialog-title">{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Fechar janela"
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}

function TicketForm({ ticket, busy, error, onSave, onClose }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(Object.fromEntries(new FormData(e.currentTarget)));
  };
  return (
    <form onSubmit={handleSubmit} className="ticket-form">
      <p className="form-intro">
        Conte o que aconteceu. Todos os campos são obrigatórios.
      </p>
      <label htmlFor="title">Título do chamado</label>
      <input
        autoFocus
        id="title"
        name="title"
        defaultValue={ticket?.title}
        placeholder="Ex.: Computador não conecta à internet"
        required
        minLength={6}
        maxLength={100}
      />
      <div className="form-pair">
        <div>
          <label htmlFor="requester">Solicitante</label>
          <input
            id="requester"
            name="requester"
            defaultValue={ticket?.requester}
            placeholder="Nome de quem precisa de ajuda"
            required
            minLength={3}
            maxLength={60}
          />
        </div>
        <div>
          <label htmlFor="department">Setor</label>
          <input
            id="department"
            name="department"
            defaultValue={ticket?.department}
            placeholder="Ex.: Financeiro"
            required
            minLength={2}
            maxLength={50}
          />
        </div>
      </div>
      <div className="form-pair">
        <div>
          <label htmlFor="category">Categoria</label>
          <select
            id="category"
            name="category"
            defaultValue={ticket?.category || "hardware"}
          >
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="priority">Prioridade</label>
          <select
            id="priority"
            name="priority"
            defaultValue={ticket?.priority || "media"}
          >
            {Object.entries(PRIORITIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>
      <label htmlFor="description">Descrição do problema</label>
      <textarea
        id="description"
        name="description"
        defaultValue={ticket?.description}
        rows={4}
        placeholder="Descreva o problema e o que já foi tentado."
        required
        minLength={10}
        maxLength={2000}
      />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button
          type="button"
          className="button secondary"
          onClick={onClose}
          disabled={busy}
        >
          Cancelar
        </button>
        <button className="button primary" disabled={busy}>
          {busy ? "Salvando…" : ticket ? "Salvar alterações" : "Criar chamado"}
          <Icon name="arrow" size={17} />
        </button>
      </div>
    </form>
  );
}

function TicketDetail({
  ticket,
  busy,
  error,
  onEdit,
  onDelete,
  onComment,
  onTransition,
}) {
  const commentRef = useRef(null);
  const [showResolution, setShowResolution] = useState(false);
  return (
    <div className="ticket-detail">
      <div className="detail-top">
        <span className="ticket-number">TI-{ticket.id}</span>
        <Badge type="status" value={ticket.status} />
        <Badge type="priority" value={ticket.priority} />
      </div>
      <h3>{ticket.title}</h3>
      <dl className="detail-meta">
        <div>
          <dt>Solicitante</dt>
          <dd>{ticket.requester}</dd>
        </div>
        <div>
          <dt>Setor</dt>
          <dd>{ticket.department}</dd>
        </div>
        <div>
          <dt>Categoria</dt>
          <dd>{CATEGORIES[ticket.category]}</dd>
        </div>
        <div>
          <dt>Aberto em</dt>
          <dd>{fullDate(ticket.createdAt)}</dd>
        </div>
      </dl>
      <p className="detail-description">{ticket.description}</p>
      {ticket.resolution && (
        <div className="resolution">
          <Icon name="checkCircle" />
          <div>
            <strong>Solução registrada</strong>
            <p>{ticket.resolution}</p>
          </div>
        </div>
      )}
      <div className="workflow-actions">
        {ticket.status === "aberto" && (
          <button
            className="button primary"
            disabled={busy}
            onClick={() => onTransition({ status: "em_andamento" })}
          >
            <Icon name="bolt" size={17} />
            Iniciar atendimento
          </button>
        )}
        {ticket.status === "em_andamento" && (
          <>
            <button
              className="button primary"
              disabled={busy}
              onClick={() => setShowResolution(!showResolution)}
            >
              <Icon name="check" size={17} />
              Registrar solução
            </button>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => onTransition({ status: "aberto" })}
            >
              Devolver à fila
            </button>
          </>
        )}
        {ticket.status === "resolvido" && (
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => onTransition({ status: "aberto" })}
          >
            Reabrir chamado
          </button>
        )}
        <button className="button text-button" disabled={busy} onClick={onEdit}>
          <Icon name="edit" size={16} />
          Editar
        </button>
        <button
          className="icon-button danger"
          disabled={busy}
          onClick={onDelete}
          aria-label="Excluir chamado"
        >
          <Icon name="trash" size={18} />
        </button>
      </div>
      {showResolution && ticket.status === "em_andamento" && (
        <form
          className="resolution-form"
          onSubmit={(e) => {
            e.preventDefault();
            onTransition({
              status: "resolvido",
              resolution: new FormData(e.currentTarget).get("resolution"),
            });
          }}
        >
          <label htmlFor="resolution">Como o problema foi resolvido?</label>
          <textarea
            autoFocus
            id="resolution"
            name="resolution"
            rows={3}
            minLength={10}
            maxLength={1000}
            required
            placeholder="Registre a solução para ajudar em atendimentos futuros."
          />
          <button className="button primary" disabled={busy}>
            {busy ? "Salvando…" : "Concluir chamado"}
          </button>
        </form>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="history-head">
        <h4>Histórico do chamado</h4>
        <span>{ticket.events.length} registros</span>
      </div>
      <ol className="timeline">
        {ticket.events.map((e) => (
          <li key={e.id}>
            <span className={`event-icon event-${e.kind}`}>
              <Icon
                name={
                  e.kind === "comment"
                    ? "message"
                    : e.kind === "status"
                      ? "check"
                      : "ticket"
                }
                size={14}
              />
            </span>
            <div>
              <p>{e.message}</p>
              <time dateTime={e.createdAt}>{fullDate(e.createdAt)}</time>
            </div>
          </li>
        ))}
      </ol>
      <form
        className="comment-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const success = await onComment({
            message: new FormData(e.currentTarget).get("message"),
          });
          if (success) commentRef.current.value = "";
        }}
      >
        <label htmlFor="message">Adicionar atualização da equipe</label>
        <textarea
          ref={commentRef}
          id="message"
          name="message"
          placeholder="O que foi verificado ou qual é o próximo passo?"
          rows={2}
          minLength={3}
          maxLength={1000}
          required
        />
        <button className="button secondary" disabled={busy}>
          {busy ? "Salvando…" : "Adicionar comentário"}
        </button>
      </form>
    </div>
  );
}

function Report({ tickets, onExport }) {
  const summary = summarize(tickets);
  return (
    <div className="report">
      <p className="form-intro">
        Um retrato dos {summary.total} chamados cadastrados agora.
      </p>
      <div className="report-numbers">
        <div>
          <strong>{summary.total}</strong>
          <span>Total de chamados</span>
        </div>
        <div>
          <strong>
            {summary.total
              ? Math.round((summary.resolvido / summary.total) * 100)
              : 0}
            %
          </strong>
          <span>Chamados resolvidos</span>
        </div>
      </div>
      <h3>Chamados por categoria</h3>
      {Object.entries(CATEGORIES).map(([key, label]) => {
        const count = tickets.filter((t) => t.category === key).length;
        return (
          <div className="report-bar" key={key}>
            <div>
              <span>{label}</span>
              <strong>{count}</strong>
            </div>
            <div className="bar-track">
              <span
                style={{
                  width: `${summary.total ? (count / summary.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        );
      })}
      <p className="report-note">
        A exportação inclui todos os chamados, com prioridade, status, datas e
        solução.
      </p>
      <button className="button primary" onClick={() => onExport(tickets)}>
        <Icon name="download" size={18} />
        Exportar todos em CSV
      </button>
    </div>
  );
}

export default function App() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filters, setFilters] = useState(emptyFilters);
  const [view, setView] = useState("overview");
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [toast, setToast] = useState(null);
  const summary = useMemo(() => summarize(tickets), [tickets]);
  const visible = useMemo(
    () => filterTickets(tickets, filters),
    [tickets, filters],
  );
  const activeTicket = tickets.find((t) => t.id === modal?.id);
  const hasFilters =
    filters.query ||
    filters.status ||
    filters.priority ||
    filters.category ||
    filters.pending;
  const load = async () => {
    setLoadError("");
    setLoading(true);
    try {
      setTickets(await repository.list());
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    const handle = (e) => {
      if (isDemo && e.key === STORAGE_KEY) load();
    };
    window.addEventListener("storage", handle);
    return () => window.removeEventListener("storage", handle);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);
  function openModal(value) {
    setActionError("");
    setModal(value);
  }
  function closeModal() {
    if (!busy) {
      setActionError("");
      setModal(null);
    }
  }
  function applyTicket(ticket) {
    setTickets((all) =>
      all.some((t) => t.id === ticket.id)
        ? all.map((t) => (t.id === ticket.id ? ticket : t))
        : [...all, ticket],
    );
  }
  async function mutate(action, onSuccess, message) {
    if (busy) return false;
    setBusy(true);
    setActionError("");
    try {
      const result = await action();
      onSuccess(result);
      setToast({ message });
      return true;
    } catch (error) {
      setActionError(error.message);
      setToast({ message: error.message, error: true });
      return false;
    } finally {
      setBusy(false);
    }
  }
  function chooseStatus(status = "") {
    setView("tickets");
    setFilters({ ...emptyFilters, status });
  }
  function exportCsv(items) {
    const url = URL.createObjectURL(
      new Blob([ticketsToCsv(items)], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "chamados-ti.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast({ message: `${items.length} chamados exportados.` });
  }
  const recentEvents = tickets
    .flatMap((t) => t.events.map((e) => ({ ...e, ticket: t })))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Ir para o conteúdo
      </a>
      <aside className="sidebar">
        <a className="brand" href="./" aria-label="Chamados TI, início">
          <span className="brand-mark">
            <Icon name="headset" size={25} />
          </span>
          <span>
            chamados<span className="brand-ti">TI</span>
          </span>
        </a>
        <div className="workspace">
          <span className="workspace-icon">S</span>
          <div>
            <strong>Central de suporte</strong>
            <span>Seu espaço de trabalho</span>
          </div>
          <span className="workspace-dot" />
        </div>
        <nav aria-label="Menu principal">
          <p className="nav-label">PRINCIPAL</p>
          <button
            className={`nav-item ${view === "overview" ? "active" : ""}`}
            aria-current={view === "overview" ? "page" : undefined}
            onClick={() => {
              setView("overview");
              setFilters(emptyFilters);
            }}
          >
            <Icon name="grid" />
            Visão geral
          </button>
          <button
            className={`nav-item ${view === "tickets" && !filters.status ? "active" : ""}`}
            aria-current={
              view === "tickets" && !filters.status ? "page" : undefined
            }
            onClick={() => chooseStatus()}
          >
            <Icon name="ticket" />
            Todos os chamados<span>{summary.total}</span>
          </button>
          <button
            className="nav-item"
            onClick={() => openModal({ type: "report" })}
          >
            <Icon name="chart" />
            Relatório
          </button>
          <p className="nav-label queue-label">SUA FILA</p>
          {Object.entries(STATUSES).map(([key, label]) => (
            <button
              key={key}
              className={`nav-item queue-item ${view === "tickets" && filters.status === key ? "active" : ""}`}
              onClick={() => chooseStatus(key)}
            >
              <span className={`queue-dot ${key}`} />
              {label}
              <span>{summary[key]}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="study-card">
            <span className="study-symbol">
              <Icon name="bolt" size={20} />
            </span>
            <strong>Da solicitação à solução.</strong>
            <p>Um passo de cada vez para um suporte mais organizado.</p>
            <a
              href="https://github.com/Wesleyttiago/chamados-ti"
              target="_blank"
              rel="noreferrer"
            >
              Explorar o projeto
              <Icon name="arrowUp" size={16} />
            </a>
          </div>
          <a
            className="author"
            href="https://wesleyttiago.github.io/"
            target="_blank"
            rel="noreferrer"
          >
            <span className="avatar author-avatar">WT</span>
            <span>
              <strong>Wesley Tiago</strong>
              <small>Projeto de estudo · ADS</small>
            </span>
            <Icon name="external" size={16} />
          </a>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace<span>/</span>
            <strong>{view === "overview" ? "Visão geral" : "Chamados"}</strong>
          </div>
          <div className="topbar-right">
            <span className="mode-label">
              <span />
              {isDemo ? "Demonstração" : "API local"}
            </span>
            <span className="avatar header-avatar">TI</span>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          <div className="page-heading">
            <div>
              <p className="eyebrow">CENTRAL DE SUPORTE</p>
              <h1>
                {view === "overview"
                  ? "Seu suporte, em dia."
                  : "Cada chamado tem seu lugar."}
              </h1>
              <p>Acompanhe a fila, organize prioridades e registre soluções.</p>
            </div>
            <button
              className="button primary new-ticket"
              onClick={() => openModal({ type: "form" })}
              disabled={loading || !!loadError}
            >
              <Icon name="plus" size={19} />
              Novo chamado
            </button>
          </div>
          <div className="demo-note">
            <Icon name="inbox" size={17} />
            <p>
              {isDemo ? (
                <>
                  Dados de exemplo fictícios. Suas alterações ficam salvas{" "}
                  <strong>neste navegador</strong>.
                </>
              ) : (
                <>
                  Conectado à API local. Os chamados são salvos no banco{" "}
                  <strong>SQLite</strong>.
                </>
              )}
            </p>
          </div>
          {loading ? (
            <div className="loading" role="status">
              Carregando chamados…
            </div>
          ) : loadError ? (
            <div className="load-error" role="alert">
              <h2>Não foi possível carregar os chamados</h2>
              <p>{loadError}</p>
              <button className="button secondary" onClick={load}>
                Tentar novamente
              </button>
            </div>
          ) : (
            <>
              {view === "overview" && (
                <section
                  className="stats-grid"
                  aria-label="Resumo dos chamados"
                >
                  {[
                    ["aberto", "Em aberto", "Aguardando atendimento", "inbox"],
                    [
                      "em_andamento",
                      "Em atendimento",
                      "Trabalho em andamento",
                      "clock",
                    ],
                    [
                      "resolvido",
                      "Resolvidos",
                      "Soluções registradas",
                      "checkCircle",
                    ],
                    [
                      "alta",
                      "Alta prioridade",
                      "Pendências que pedem atenção",
                      "bolt",
                    ],
                  ].map(([key, title, subtitle, icon]) => (
                    <button
                      key={key}
                      className={`stat-card stat-${key}`}
                      onClick={() =>
                        key === "alta"
                          ? (setView("tickets"),
                            setFilters({
                              ...emptyFilters,
                              priority: "alta",
                              pending: true,
                            }))
                          : chooseStatus(key)
                      }
                      aria-label={`Ver ${title.toLowerCase()}: ${summary[key]}`}
                    >
                      <div className="stat-top">
                        <span>{title}</span>
                        <span className="stat-icon">
                          <Icon name={icon} size={19} />
                        </span>
                      </div>
                      <strong>{String(summary[key]).padStart(2, "0")}</strong>
                      <p>{subtitle}</p>
                      <Icon name="arrowUp" size={16} className="stat-arrow" />
                    </button>
                  ))}
                </section>
              )}
              <section
                className="ticket-panel"
                aria-labelledby="ticket-panel-title"
              >
                <div className="panel-heading">
                  <div>
                    <h2 id="ticket-panel-title">
                      {view === "overview"
                        ? "A fila de chamados"
                        : filters.pending
                          ? "Alta prioridade pendente"
                          : filters.status
                            ? STATUSES[filters.status]
                            : "Todos os chamados"}
                      <span className="count-badge">{tickets.length}</span>
                    </h2>
                    <p>Encontre um chamado e acompanhe o atendimento.</p>
                  </div>
                  <button
                    className="button secondary export-button"
                    onClick={() => exportCsv(visible)}
                    disabled={!visible.length}
                  >
                    <Icon name="download" size={17} />
                    Exportar CSV
                  </button>
                </div>
                <div className="filter-toolbar">
                  <label className="search-field">
                    <Icon name="search" size={19} />
                    <input
                      aria-label="Buscar chamados"
                      value={filters.query}
                      onChange={(e) =>
                        setFilters({ ...filters, query: e.target.value })
                      }
                      placeholder="Buscar por título, pessoa ou ID…"
                    />
                  </label>
                  <select
                    aria-label="Filtrar por status"
                    value={filters.status}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        status: e.target.value,
                        pending: false,
                      })
                    }
                  >
                    <option value="">Todos os status</option>
                    {Object.entries(STATUSES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Filtrar por prioridade"
                    value={filters.priority}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        priority: e.target.value,
                        pending: false,
                      })
                    }
                  >
                    <option value="">Prioridades</option>
                    {Object.entries(PRIORITIES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Filtrar por categoria"
                    value={filters.category}
                    onChange={(e) =>
                      setFilters({ ...filters, category: e.target.value })
                    }
                  >
                    <option value="">Categorias</option>
                    {Object.entries(CATEGORIES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">CHAMADO</th>
                        <th scope="col">SOLICITANTE</th>
                        <th scope="col">PRIORIDADE</th>
                        <th scope="col">STATUS</th>
                        <th scope="col" className="updated-column">
                          ATUALIZADO
                        </th>
                        <th scope="col">
                          <span className="sr-only">Abrir</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((ticket) => (
                        <tr key={ticket.id}>
                          <td className="ticket-cell">
                            <span className="ticket-number">
                              TI-{ticket.id}
                            </span>
                            <button
                              className="ticket-title"
                              onClick={() =>
                                openModal({ type: "detail", id: ticket.id })
                              }
                            >
                              {ticket.title}
                            </button>
                            <span className="ticket-category">
                              {CATEGORIES[ticket.category]}
                              <span>·</span>
                              {ticket.department}
                            </span>
                          </td>
                          <td className="requester-cell">
                            <span className={`avatar avatar-${ticket.id % 4}`}>
                              {initials(ticket.requester)}
                            </span>
                            <span>{ticket.requester}</span>
                          </td>
                          <td>
                            <Badge type="priority" value={ticket.priority} />
                          </td>
                          <td>
                            <Badge type="status" value={ticket.status} />
                          </td>
                          <td className="updated-column">
                            <time
                              dateTime={ticket.updatedAt}
                              title={fullDate(ticket.updatedAt)}
                            >
                              {shortDate(ticket.updatedAt)}
                            </time>
                          </td>
                          <td className="row-action">
                            <button
                              className="icon-button"
                              aria-label={`Abrir chamado TI-${ticket.id}`}
                              onClick={() =>
                                openModal({ type: "detail", id: ticket.id })
                              }
                            >
                              <Icon name="arrow" size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!visible.length && (
                  <div className="empty-state">
                    <span>
                      <Icon name="search" size={30} />
                    </span>
                    <h3>
                      {tickets.length
                        ? "Nenhum chamado encontrado"
                        : "A fila está vazia"}
                    </h3>
                    <p>
                      {tickets.length
                        ? "Tente outro termo ou remova os filtros."
                        : "Abra um novo chamado para começar."}
                    </p>
                    <button
                      className="button secondary"
                      onClick={() =>
                        tickets.length
                          ? setFilters(emptyFilters)
                          : openModal({ type: "form" })
                      }
                    >
                      {tickets.length
                        ? "Limpar filtros"
                        : "Criar primeiro chamado"}
                    </button>
                  </div>
                )}
                <div className="table-footer">
                  <span aria-live="polite">
                    {visible.length} de {tickets.length} chamados
                    {hasFilters ? (
                      <button
                        onClick={() => setFilters(emptyFilters)}
                        className="clear-filters"
                      >
                        Limpar filtros
                      </button>
                    ) : null}
                  </span>
                  <label>
                    Ordenar por
                    <select
                      aria-label="Ordenar chamados"
                      value={filters.sort}
                      onChange={(e) =>
                        setFilters({ ...filters, sort: e.target.value })
                      }
                    >
                      <option value="recent">Mais recentes</option>
                      <option value="priority">Prioridade</option>
                    </select>
                  </label>
                </div>
              </section>
              {view === "overview" && (
                <div className="bottom-grid">
                  <section
                    className="activity-panel"
                    aria-labelledby="activity-title"
                  >
                    <div className="small-panel-heading">
                      <h2 id="activity-title">Últimas movimentações</h2>
                      <span className="live-dot">Ao vivo</span>
                    </div>
                    {recentEvents.length ? (
                      <ul className="activity-list">
                        {recentEvents.map((e) => (
                          <li key={e.id}>
                            <span className={`activity-icon event-${e.kind}`}>
                              <Icon
                                name={
                                  e.kind === "comment" ? "message" : "ticket"
                                }
                                size={16}
                              />
                            </span>
                            <div>
                              <button
                                onClick={() =>
                                  openModal({ type: "detail", id: e.ticket.id })
                                }
                              >
                                TI-{e.ticket.id}
                                <span>{e.ticket.title}</span>
                              </button>
                              <p>
                                {e.kind === "create"
                                  ? "Novo chamado na fila"
                                  : e.kind === "comment"
                                    ? "Atualização adicionada ao histórico"
                                    : e.kind === "edit"
                                      ? "Dados do chamado atualizados"
                                      : "Status do atendimento atualizado"}
                              </p>
                            </div>
                            <time dateTime={e.createdAt}>
                              {shortDate(e.createdAt)}
                            </time>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="quiet">
                        As movimentações aparecem aqui conforme você usa o
                        sistema.
                      </p>
                    )}
                  </section>
                  <section className="progress-panel">
                    <span className="progress-label">
                      <Icon name="checkCircle" size={18} />
                      DO CHAMADO À SOLUÇÃO
                    </span>
                    <div className="progress-total">
                      <strong>
                        {summary.total
                          ? Math.round(
                              (summary.resolvido / summary.total) * 100,
                            )
                          : 0}
                        <span>%</span>
                      </strong>
                      <span>
                        dos chamados
                        <br />
                        resolvidos
                      </span>
                      <div
                        className="progress-ring"
                        style={{
                          "--progress": `${summary.total ? (summary.resolvido / summary.total) * 100 : 0}%`,
                        }}
                        aria-hidden="true"
                      >
                        <Icon name="check" size={22} />
                      </div>
                    </div>
                    <div className="progress-track">
                      <span
                        style={{
                          width: `${summary.total ? (summary.resolvido / summary.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <p>
                      {summary.resolvido} resolvidos ·{" "}
                      {summary.total - summary.resolvido} em aberto ou em
                      atendimento
                    </p>
                    <button onClick={() => openModal({ type: "report" })}>
                      Ver relatório completo
                      <Icon name="arrow" size={17} />
                    </button>
                  </section>
                </div>
              )}
            </>
          )}
          <footer className="page-footer">
            <span>
              Chamados TI<span>·</span>Feito para aprender, pensado para
              resolver.
            </span>
            <a
              href="https://github.com/Wesleyttiago/chamados-ti"
              target="_blank"
              rel="noreferrer"
            >
              Código no GitHub
              <Icon name="arrowUp" size={14} />
            </a>
          </footer>
        </main>
      </div>
      {toast && (
        <div
          className={`toast ${toast.error ? "toast-error" : ""}`}
          role={toast.error ? "alert" : "status"}
        >
          <Icon name={toast.error ? "close" : "checkCircle"} size={20} />
          <span>{toast.message}</span>
          <button
            className="icon-button"
            aria-label="Fechar aviso"
            onClick={() => setToast(null)}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
      {modal?.type === "form" && (
        <Dialog
          key="form"
          title={modal.ticket ? "Editar chamado" : "Novo chamado"}
          onClose={closeModal}
        >
          <TicketForm
            ticket={modal.ticket}
            error={actionError}
            busy={busy}
            onClose={closeModal}
            onSave={(input) =>
              mutate(
                () =>
                  modal.ticket
                    ? repository.update(modal.ticket.id, input)
                    : repository.create(input),
                (result) => {
                  applyTicket(result);
                  setModal({ type: "detail", id: result.id });
                },
                modal.ticket
                  ? "Chamado atualizado."
                  : "Chamado criado. Agora ele faz parte da sua fila.",
              )
            }
          />
        </Dialog>
      )}
      {modal?.type === "detail" && activeTicket && (
        <Dialog
          key="detail"
          title="Detalhes do chamado"
          onClose={closeModal}
          className="detail-dialog"
        >
          <TicketDetail
            ticket={activeTicket}
            error={actionError}
            busy={busy}
            onEdit={() => openModal({ type: "form", ticket: activeTicket })}
            onDelete={() => openModal({ type: "delete", id: activeTicket.id })}
            onComment={(input) =>
              mutate(
                () => repository.comment(activeTicket.id, input),
                applyTicket,
                "Comentário adicionado ao histórico.",
              )
            }
            onTransition={(input) =>
              mutate(
                () => repository.transition(activeTicket.id, input),
                applyTicket,
                "Status do chamado atualizado.",
              )
            }
          />
        </Dialog>
      )}
      {modal?.type === "report" && (
        <Dialog key="report" title="Relatório da central" onClose={closeModal}>
          <Report tickets={tickets} onExport={exportCsv} />
        </Dialog>
      )}
      {modal?.type === "delete" && activeTicket && (
        <Dialog
          key="delete"
          title="Excluir este chamado?"
          onClose={closeModal}
          className="confirm-dialog"
        >
          <div className="confirm-content">
            <p>
              O chamado <strong>TI-{activeTicket.id}</strong> e seu histórico
              serão removidos. Esta ação não pode ser desfeita.
            </p>
            {actionError && (
              <p className="form-error" role="alert">
                {actionError}
              </p>
            )}
            <div className="dialog-actions">
              <button
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  openModal({ type: "detail", id: activeTicket.id })
                }
              >
                Voltar
              </button>
              <button
                className="button danger-button"
                disabled={busy}
                onClick={() =>
                  mutate(
                    () => repository.remove(activeTicket.id),
                    () => {
                      setTickets((all) =>
                        all.filter((t) => t.id !== activeTicket.id),
                      );
                      setModal(null);
                    },
                    "Chamado excluído.",
                  )
                }
              >
                {busy ? "Excluindo…" : "Excluir chamado"}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
