# Publicação e gestão do Registro Colmeia (custo zero)

Arquitetura em produção:

```
Navegador -> Vercel (frontend Next.js) -- /api/* --> Render (API .NET, Docker) --> TiDB Cloud (MySQL)
```

| Parte | Serviço | Plano |
|---|---|---|
| Código | GitHub | grátis |
| Frontend | Vercel | Hobby (grátis) |
| Backend (`backend/Dockerfile`) | Render | Free (dorme após 15 min sem acesso) |
| Banco | TiDB Cloud Starter (compatível com MySQL) | Free |
| Evitar que o backend durma | UptimeRobot | Free |

Recomenda-se criar todas as contas com um único e-mail do projeto (por exemplo um Gmail dedicado). Na passagem de responsabilidade, basta entregar esse e-mail e a senha ao novo responsável, e depois trocar a senha.

## 1. Banco de dados (TiDB Cloud)

1. Crie conta em https://tidbcloud.com e um cluster **Starter** (plano gratuito).
2. Em *Connect*, gere a senha e anote host, porta (4000), usuário e senha.
3. Crie o banco: `CREATE DATABASE colmeia CHARACTER SET utf8mb4;`
4. Monte a connection string (SSL é obrigatório):

```
Server=<host>;Port=4000;Database=colmeia;User=<usuario>;Password=<senha>;SslMode=Required;
```

As tabelas são criadas sozinhas pelo backend ao iniciar (EF Migrations).

## 2. Backend (Render)

1. Em https://render.com, crie um **Web Service** a partir do repositório do GitHub.
2. Runtime: **Docker**. Root Directory: `registro-colmeia/backend`. Plano: **Free**.
3. Variáveis de ambiente:

| Nome | Valor |
|---|---|
| `ConnectionStrings__Default` | connection string do passo 1 |
| `Jwt__Key` | texto aleatório com 32+ caracteres (gere um novo, não use o do repositório) |
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `PORT` | `8080` |

4. Health check path: `/health`.
5. Após o deploy, anote a URL (`https://xxxx.onrender.com`) e confira `https://xxxx.onrender.com/health`.

## 3. Frontend (Vercel)

1. Em https://vercel.com, **Add New Project** e importe o repositório.
2. **Root Directory:** `registro-colmeia/frontend`. Framework: Next.js (detectado).
3. Variável de ambiente: `API_INTERNAL_URL` = URL do Render (sem barra no final).
4. Deploy. A cada push na branch de produção, o Vercel publica de novo.

## 4. Manter o backend acordado

No plano grátis do Render o backend dorme e o primeiro acesso demora cerca de um minuto. Para evitar:
crie um monitor HTTP no https://uptimerobot.com para `https://xxxx.onrender.com/health` a cada 5 minutos.

## 5. Dia a dia

- Editar o projeto: alterar o código e dar push no GitHub. Vercel e Render publicam sozinhos.
- Ver erros do backend: painel do Render, aba *Logs*.
- Ver dados: painel do TiDB Cloud (*SQL Editor*) ou qualquer cliente MySQL.
- Rodar localmente: `docker compose up --build` dentro de `registro-colmeia` (sobe MariaDB, API, frontend e Nginx em http://localhost).

## Passagem de responsabilidade

- Opção A (mais simples): entregar o e-mail do projeto com acesso às contas.
- Opção B: o novo responsável cria as próprias contas e refaz os passos 1 a 3 (cerca de 30 minutos). Para isso, transfira o repositório do GitHub (Settings > Transfer ownership). No Vercel Hobby não dá para adicionar colaboradores nem transferir para outra conta pessoal, então o novo responsável deve importar o repositório de novo.
