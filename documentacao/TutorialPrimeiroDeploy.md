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

### Compatibilidade com o TiDB

O TiDB não aceita o collation `ascii_general_ci`, que é o padrão do Pomelo para colunas `Guid`. Por isso o `ColmeiaContext` usa `modelBuilder.UseGuidCollation("ascii_bin")`, e as migrations criam as colunas `char(36)` com `ascii_bin`. Esse collation funciona no TiDB e no MariaDB.

Ao criar migrations novas, revise o SQL gerado. Se aparecer `ascii_general_ci` (por exemplo em `migrationBuilder.Sql(...)` escrito à mão), troque por `ascii_bin`.

Para testar as migrations no TiDB antes do deploy, rode um TiDB local:

```
docker run --rm --name tidb-test -p 4000:4000 pingcap/tidb:v7.5.1
```

Depois crie o banco `colmeia` (usuário `root`, sem senha) e rode o backend com:

```
set ConnectionStrings__Default=Server=localhost;Port=4000;Database=colmeia;User=root;
dotnet run --project backend\ColmeiaApi
```

## 2. Backend (Render)

1. Em https://render.com, crie um **Web Service** a partir do repositório do GitHub.
2. Runtime: **Docker**. Branch: **main**. Root Directory: `backend`. Plano: **Free**.
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
2. **Root Directory:** `frontend`. Framework: Next.js (detectado).
3. Variável de ambiente: `API_INTERNAL_URL` = URL do Render (sem barra no final). Ela é lida durante o build: se a URL do Render mudar, atualize a variável e faça um novo deploy no Vercel.
4. Deploy. A cada push na `main`, o Vercel publica de novo.

## 3.1 Primeiro administrador

O banco de produção começa vazio e o sistema não cria nenhum administrador. Todo cadastro novo vira "Pesquisador" não aprovado, e usuários não aprovados não conseguem fazer login. Por isso o primeiro admin precisa ser criado direto no banco:

1. Cadastre-se pelo site publicado no Vercel.
2. No painel do TiDB Cloud, abra o **SQL Editor** e execute (troque o e-mail):

```sql
UPDATE colmeia.Usuario SET permissao = 'Admin', aprovado = 1 WHERE email = 'seu@email.com';
```

3. Faça login. A partir daí, aprove os outros usuários pela área de administração (`/admin`).

## 4. Manter o backend acordado

No plano grátis do Render o backend dorme e o primeiro acesso demora cerca de um minuto. Para evitar:
crie um monitor HTTP no https://uptimerobot.com para `https://xxxx.onrender.com/health` a cada 5 minutos.

## 5. Dia a dia

- Editar o projeto: trabalhe numa branch, abra PR para a `develop` e, quando estiver pronto para publicar, abra PR da `develop` para a `main`. Vercel e Render publicam sozinhos a cada merge na `main`.
- Ver erros do backend: painel do Render, aba *Logs*.
- Ver dados: painel do TiDB Cloud (*SQL Editor*) ou qualquer cliente MySQL.
- Rodar localmente: `docker compose up --build` na raiz do repositório (sobe MariaDB, API, frontend e Nginx em http://localhost).

## Passagem de responsabilidade

- Opção A (mais simples): entregar o e-mail do projeto com acesso às contas.
- Opção B: o novo responsável cria as próprias contas e refaz os passos 1 a 3 (cerca de 30 minutos). Para isso, transfira o repositório do GitHub (Settings > Transfer ownership). No Vercel Hobby não dá para adicionar colaboradores nem transferir para outra conta pessoal, então o novo responsável deve importar o repositório de novo.
