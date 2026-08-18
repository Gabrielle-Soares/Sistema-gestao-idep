# Sistema de Projetos (Principal + Pedagogico + Financeiro)

Sistema de cadastro de projetos do IDEP Brasil, com login e tres areas de trabalho:

- **Login** (com **tela "Minha Conta"** para trocar a propria senha).
- **Pedagogico**: cursos com **instrutor selecionavel** (cadastrado uma vez, reaproveitado em varios cursos); alunos/ouvintes com dados basicos (**NIS, CPF, data de nascimento, telefone**) e dados complementares opcionais (**endereco, escolaridade, renda familiar, cor/raca, genero, comunidade tradicional, PCD, LGBT, observacoes**); geracao de **lista de presenca em PDF** (logo do IDEP, espaco para assinatura) e **exportacao da lista de alunos para Excel** (.xlsx).
- **Financeiro**: origem do lancamento (vinculada a outro projeto do sistema) e anexo de **nota fiscal (NF)**.

Stack: **React (Vite)** no front-end, **Node.js + Express** no back-end, banco de dados **SQLite** (arquivo local), autenticacao via **JWT**.

> **Nota sobre dados sensiveis**: os campos de cor/raca, genero, PCD e LGBT sao dados sensiveis protegidos pela LGPD. Eles sao opcionais (ficam escondidos em "Dados complementares") e servem para relatorios de inclusao social do instituto. Vale revisar quem tem acesso ao sistema antes de usar em producao.

## Sobre o design

Layout de **sidebar fixa** com navegacao em "trilha" (Principal → Pedagogico → Financeiro), remetendo a trilha de desenvolvimento profissional do IDEP. Paleta institucional (tinta marinho + vermelho da marca + verde para estados concluidos), tipografia combinando serifada (Zilla Slab) com sans-serif (Inter) e mono (IBM Plex Mono, em dados como NIS/CPF/datas). Responsivo (testado em desktop e mobile).

## Login padrao

Na primeira execucao do back-end, um usuario administrador e criado automaticamente:

- **Usuario:** `admin`
- **Senha:** `idep2026`

Troque a senha pela tela **Minha Conta** assim que possivel (clique no seu nome, no rodape da barra lateral).

## Pre-requisitos

- [Node.js](https://nodejs.org) 18 ou superior (`node -v` para conferir).

## Como rodar localmente

Duas partes rodando ao mesmo tempo: back-end (porta 3001) e front-end (porta 5173). Abra dois terminais.

### 1. Back-end
```bash
cd backend
npm install
npm start
```
O arquivo `backend/sistema.db` e criado automaticamente na primeira execucao.

### 2. Front-end
```bash
cd frontend
npm install
npm run dev
```
Abra o link mostrado (ex: `http://localhost:5173`).

## Como usar

1. **Login** com `admin` / `idep2026`. Troque a senha em **Minha Conta**.
2. Aba **Principal**: crie, edite ou exclua projetos. Clique em **Abrir** para trabalhar nele.
3. Aba **Pedagogico**: cadastre **instrutores** primeiro (botao "Gerenciar instrutores"), depois cursos (selecionando o instrutor). Dentro de cada curso, adicione alunos/ouvintes — os campos basicos ficam visiveis, os complementares aparecem ao clicar em "+ Dados complementares". Use **Exportar para Excel** para baixar a planilha completa, ou **Gerar lista em PDF** para a lista de assinatura.
4. Aba **Financeiro**: registre lancamentos com origem e anexo de NF.

## Estrutura do projeto

```
sistema-projetos/
├── backend/
│   ├── server.js
│   ├── db.js                 # schema SQLite + usuario admin padrao
│   ├── auth.js                # JWT
│   ├── assets/logo-idep.png
│   ├── routes/
│   │   ├── auth.js            # login + troca de senha
│   │   ├── projetos.js        # CRUD (inclui edicao)
│   │   ├── pedagogico.js      # cursos, alunos, PDF e export Excel
│   │   ├── instrutores.js
│   │   └── financeiro.js
│   └── uploads/
└── frontend/
    └── src/
        ├── App.jsx             # sidebar + trilha + Minha Conta
        ├── index.css
        ├── auth.js
        ├── api.js
        └── components/
            ├── Login.jsx
            ├── MinhaConta.jsx  # troca de senha
            ├── AbaPrincipal.jsx    # inclui edicao de projeto
            ├── AbaPedagogico.jsx   # instrutores + form completo de aluno + Excel
            └── AbaFinanceiro.jsx
```

## Proximos passos sugeridos

- Cadastro de mais usuarios (hoje so existe o admin criado automaticamente).
- Edicao de cursos direto pela tela (hoje e possivel criar e excluir).
- Migrar de SQLite para PostgreSQL se o volume de dados crescer bastante.
- Definir a variavel de ambiente `JWT_SECRET` com um valor proprio antes de usar em producao.
