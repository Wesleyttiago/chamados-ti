# Por onde estudar

Um sistema de suporte liga um problema real a conteúdos de ADS: formulários, lógica, banco relacional, HTTP e testes. A ideia é avançar um pedaço por vez.

1. Rode `npm ci` e `npm run dev`. Abra um chamado, busque pelo nome, edite e veja o histórico.
2. Leia `src/App.jsx`. Encontre os estados `tickets` e `filters`. Veja como uma alteração muda a tela.
3. Leia `shared/domain.js`. O chamado começa aberto; precisa entrar em atendimento antes de ser resolvido. A solução é obrigatória. Essas regras valem na demo e na API.
4. Compare os dois caminhos de `src/repository.js`: armazenamento do navegador e requisições HTTP.
5. Rode `npm run dev:full`. Agora o front-end usa a API e o arquivo SQLite. Os dados desta versão são separados dos da demo.
6. Leia `server/schema.sql`: um chamado tem vários registros de histórico. A chave estrangeira liga as duas tabelas. Excluir o chamado também exclui seu histórico.
7. Leia `server/app.js` e `server/database.js`. Siga um POST do formulário até o INSERT. Os valores entram por parâmetros `?`, sem montar SQL com texto do usuário.
8. Rode `npm test`. Veja como os testes tentam resolver sem solução, usar uma categoria inválida e buscar um ID inexistente.

## Um fluxo para explicar

Ao criar um chamado, o React coleta os campos. A API valida, insere o chamado e o primeiro registro do histórico numa transação. O SQLite confirma as duas gravações juntas. A resposta volta para o React atualizar a lista.

| Ação                         | Rota                                      |
| ---------------------------- | ----------------------------------------- |
| Listar / cadastrar           | `GET /api/tickets` / `POST /api/tickets`  |
| Consultar / editar / excluir | `GET` / `PUT` / `DELETE /api/tickets/:id` |
| Mudar status                 | `PATCH /api/tickets/:id/status`           |
| Adicionar comentário         | `POST /api/tickets/:id/comments`          |

## Próximos exercícios

- Adicionar o campo equipamento ao formulário, à validação e à tabela SQL.
- Criar um filtro por setor e um teste para ele.
- Consultar quantos chamados existem por categoria com `GROUP BY`.
- Separar a lista de chamados em um componente React próprio.
- Depois de entender o fluxo, estudar usuários e autenticação para uma versão com várias pessoas.

O servidor é de estudo e escuta apenas em `127.0.0.1`. Ele não tem autenticação. O GitHub Pages publica só o front-end; não executa Node.js ou SQLite. O módulo `node:sqlite` ainda é experimental no Node 24 e pode emitir um aviso.

## Referências

- [GitHub: apresentar projetos no perfil](https://docs.github.com/en/account-and-profile/tutorials/using-your-github-profile-to-enhance-your-resume)
- [The Odin Project: projeto com CRUD e banco relacional](https://www.theodinproject.com/lessons/node-path-nodejs-inventory-application)
- [Vite: publicação no GitHub Pages](https://vite.dev/guide/static-deploy.html)
- [Node.js: SQLite](https://nodejs.org/api/sqlite.html)
