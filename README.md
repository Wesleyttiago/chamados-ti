# Chamados TI

Sistema de chamados para estudar React, API REST e SQL. Tem cadastro, busca, filtros, histórico, solução e exportação CSV.

[Testar no navegador](https://wesleyttiago.github.io/chamados-ti/)

A demo usa dados fictícios e salva neste navegador. A versão local usa uma API Node.js com SQLite, sem login.

Para rodar, use Node.js 24 ou superior:

```bash
npm ci
npm run dev:full
```

Abra http://127.0.0.1:5173. O banco é criado em `data/chamados.sqlite`.

`npm run dev` abre só a demo. `npm test` testa a API e as regras. `npm run build` gera a página.

[Roteiro de estudo](docs/estudo.md)
