# Registro Colmeia

Aplicação web para registrar e acompanhar colmeias de abelhas: cadastro de colmeias, registros de saúde, localização e sensores, painel de dados com gráficos, área de administração com aprovação de usuários e solicitações de alteração, além de jogos educativos.

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Recharts |
| Backend | ASP.NET Core (.NET 9), Entity Framework Core 9 (Pomelo MySQL), autenticação JWT, BCrypt, Swagger |
| Banco de dados | MariaDB 11 (local) e TiDB Cloud (produção) |
| Proxy reverso | Nginx |
| Testes | xUnit (backend), Vitest, Testing Library e jest-axe (frontend) |

## Estrutura

```
backend/        API .NET (ColmeiaApi) e testes (ColmeiaApi.Tests)
frontend/       Aplicação Next.js
banco/          Script inicial do banco (init.sql)
nginx/          Configuração do proxy reverso
documentacao/   Diagramas (arquitetura, MER), guias de publicação e rascunhos
scripts/        Scripts de apoio (cadastro do primeiro admin)
docker-compose.yml
```

## Como rodar

### Com Docker (recomendado)

Requer Docker e Docker Compose.

```bash
docker compose up --build
```

Sobe MariaDB, API, frontend e Nginx. A aplicação fica em http://localhost. A API também fica exposta em http://localhost:5027.

### Sem Docker (desenvolvimento)

Requer .NET 9 SDK, Node.js e um MariaDB/MySQL local com o banco `colmeia` e o usuário configurados em `backend/ColmeiaApi/appsettings.Development.json`.

Backend (http://localhost:5027):

```bash
cd backend/ColmeiaApi
dotnet run
```

As tabelas são criadas pelo backend ao iniciar, via EF Migrations.

Frontend:

```bash
cd frontend
npm install
npm run dev
```

O frontend encaminha as chamadas `/api/*` para a URL definida em `API_INTERNAL_URL` (veja `frontend/next.config.ts`).

## Testes

```bash
# Backend
cd backend/ColmeiaApi.Tests
dotnet test

# Frontend
cd frontend
npm test
```

## Configuração

| Variável | Onde | Descrição |
|---|---|---|
| `ConnectionStrings__Default` | backend | Connection string do banco |
| `Jwt__Key` | backend | Chave de assinatura do JWT (mínimo 32 caracteres) |
| `ASPNETCORE_ENVIRONMENT` | backend | `Development` ou `Production` |
| `API_INTERNAL_URL` | frontend | URL do backend usada para reescrever `/api/*` |

Os valores presentes em `appsettings*.json` e `docker-compose.yml` servem apenas para desenvolvimento. Em produção, defina novos valores por variáveis de ambiente.

## Publicação

O sistema é publicado sem custo em Vercel (frontend), Render (backend) e TiDB Cloud (banco). As contas desses serviços usam a conta Google do projeto; para ter acesso, contate os professores responsáveis pelo projeto de extensão.

- [Arquitetura de publicação e manutenção](documentacao/ArquiteturaPublicacaoManutencao.md): como a publicação funciona e como manter o sistema.
- [Tutorial de primeiro deploy](documentacao/TutorialPrimeiroDeploy.md): publicar do zero.

## Branches

- `main`: versão estável.
- `develop`: integração do desenvolvimento.
- `feature/*`: novas funcionalidades, criadas a partir de `develop`.
