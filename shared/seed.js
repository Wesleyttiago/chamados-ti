export function createSeed(now = new Date()) {
  const ago = (hours) =>
    new Date(now.getTime() - hours * 3600000).toISOString();
  const items = [
    [
      "Computador não liga na recepção",
      "Ao apertar o botão, a máquina não apresenta nenhum sinal. Já conferimos a tomada e o cabo de energia.",
      "Ana Lima",
      "Recepção",
      "hardware",
      "alta",
      "aberto",
      3,
    ],
    [
      "Sem acesso à pasta compartilhada",
      "A pasta de documentos da equipe aparece como indisponível desde o início do expediente.",
      "Lucas Santos",
      "Financeiro",
      "acesso",
      "alta",
      "em_andamento",
      7,
    ],
    [
      "Impressora imprime com faixas",
      "As páginas estão saindo com faixas verticais. O problema acontece em todos os computadores do setor.",
      "Marina Costa",
      "Administrativo",
      "hardware",
      "media",
      "aberto",
      10,
    ],
    [
      "Wi-Fi desconectando na sala 02",
      "A conexão cai a cada poucos minutos na sala de reuniões. Pela rede cabeada funciona normalmente.",
      "Pedro Alves",
      "Operações",
      "rede",
      "media",
      "em_andamento",
      20,
    ],
    [
      "Atualização do navegador",
      "Precisamos atualizar o navegador para acessar o novo sistema interno de treinamento.",
      "Beatriz Rocha",
      "Treinamento",
      "software",
      "baixa",
      "resolvido",
      27,
    ],
    [
      "Configurar segundo monitor",
      "O segundo monitor foi conectado, mas ainda está espelhando a tela principal. Precisamos estender a área de trabalho.",
      "Rafael Melo",
      "Comercial",
      "hardware",
      "baixa",
      "resolvido",
      44,
    ],
  ];
  return items.map(
    (
      [
        title,
        description,
        requester,
        department,
        category,
        priority,
        status,
        hours,
      ],
      index,
    ) => {
      const id = 101 + index;
      const createdAt = ago(hours);
      const updatedAt =
        status === "aberto" ? createdAt : ago(Math.max(1, hours - 3));
      const resolution =
        status === "resolvido"
          ? index === 4
            ? "Navegador atualizado e acesso ao sistema confirmado."
            : "Modo de exibição alterado para estender as telas."
          : "";
      const events = [
        {
          id: `seed-${id}-1`,
          kind: "create",
          message: "Chamado aberto.",
          createdAt,
        },
      ];
      if (status !== "aberto")
        events.push({
          id: `seed-${id}-2`,
          kind: "status",
          message: "Status: Aberto → Em atendimento.",
          createdAt: ago(hours - 1),
        });
      if (status === "resolvido")
        events.push({
          id: `seed-${id}-3`,
          kind: "status",
          message: `Status: Em atendimento → Resolvido. Solução: ${resolution}`,
          createdAt: updatedAt,
        });
      if (index === 1)
        events.push({
          id: `seed-${id}-4`,
          kind: "comment",
          message:
            "Permissões da pasta em análise. A conexão com o servidor está funcionando.",
          createdAt: updatedAt,
        });
      return {
        id,
        title,
        description,
        requester,
        department,
        category,
        priority,
        status,
        resolution,
        createdAt,
        updatedAt,
        events,
      };
    },
  );
}
