# Tutorial de primeiro deploy

Este tutorial publica o Registro Colmeia do zero, sem custo: banco no TiDB Cloud, backend no Render e frontend no Vercel. Ele só é necessário quando o sistema ainda não está publicado ou quando é preciso recriar tudo em contas novas.

Para entender como a publicação funciona e como manter o sistema no dia a dia, leia [ArquiteturaPublicacaoManutencao.md](ArquiteturaPublicacaoManutencao.md).

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

## 0. Antes de começar

- **Conta do projeto:** em todos os serviços, entre com a conta Google criada para o projeto (botão "Continuar com Google" ou "Sign in with Google"). Não crie contas pessoais. Para ter acesso a essa conta, entre em contato com os professores responsáveis pelo projeto de extensão.
- **Repositório:** o código fica em `abelhassenai/RegistrosSaude`. Render e Vercel publicam a partir da branch `main`, então a `main` precisa estar com a versão que você quer publicar.
- **Senhas:** a senha do banco e a chave JWT só vão nas variáveis de ambiente do Render. Não coloque essas senhas em arquivos do repositório nem envie por chat. Se alguma vazar, troque (ver o documento de manutenção).

## 1. Banco de dados (TiDB Cloud)

### 1.1 Criar a instância

1. Entre em https://tidbcloud.com com a conta do projeto.
2. Em **My TiDB**, clique em **Create Resource**.
3. Escolha o plano **Starter** (gratuito). Não use Essential, Premium nem Dedicated, que são pagos.
4. Se aparecer a escolha de compatibilidade, use **MySQL**.
5. Provedor **AWS**, região **Oregon (us-west-2)**. O Render também vai ficar em Oregon (passo 2). Banco e backend na mesma região deixam a conexão mais rápida.
6. Nome da instância: `colmeia`. O nome só aparece no painel e pode ser outro.
7. Projeto: deixe o **Default Project**. Se a lista estiver vazia, crie um projeto com qualquer nome.
8. Se houver campo de limite de gasto (*spending limit*), deixe em **0**. Assim a conta nunca gera cobrança.
9. Clique em **Create**. Se pedir cartão de crédito, pare: o plano Starter não deveria pedir.

### 1.2 Gerar a senha e criar o banco

1. Abra a instância e clique em **Connect**.
2. Deixe **Connection Type** em **Public Endpoint** e **Branch** em **main**. Os outros campos (Database, Operating System, Connect With) só mudam o exemplo de conexão e podem ficar como estão. Não é preciso baixar o CA cert.
3. Clique em **Generate Password** e guarde a senha num lugar seguro. Ela só aparece uma vez.
4. Anote **HOST**, **PORT** (4000) e **USERNAME**. O usuário tem um prefixo e termina em `.root` (por exemplo, `xxxxxxxx.root`). Copie pelo botão de copiar, porque é fácil errar letras digitando.
5. No menu lateral da instância, abra o **SQL Editor** e execute:

```sql
CREATE DATABASE colmeia CHARACTER SET utf8mb4;
```

### 1.3 Montar a connection string

Monte a linha abaixo com os seus valores, sem os sinais `<` e `>`, sem aspas e sem espaços nas pontas:

```
Server=<host>;Port=4000;Database=colmeia;User=<usuario>;Password=<senha>;SslMode=Required;
```

Exemplo de formato (valores fictícios):

```
Server=gateway01.us-west-2.prod.aws.tidbcloud.com;Port=4000;Database=colmeia;User=AbCdEf123.root;Password=SENHA;SslMode=Required;
```

Se a senha tiver `;` ou `=`, coloque-a entre aspas simples: `Password='minha;senha'`.

As tabelas são criadas sozinhas pelo backend ao iniciar (EF Migrations). Não crie tabelas à mão.

### 1.4 Firewall

Toda instância Starter nova já vem com a regra **Allow_all_public_connections**, que libera todos os IPs. Não apague essa regra: o Render gratuito não tem IP fixo, e restringir os IPs bloqueia o backend. A regra fica em *instância > Settings > Networking*.

### 1.5 Compatibilidade com o TiDB

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

1. Entre em https://render.com com a conta do projeto.
2. Clique em **New > Web Service** e escolha o repositório `abelhassenai/RegistrosSaude`.
   - O Render pede para instalar o app dele no GitHub. O repositório pertence à organização **abelhassenai**, então o app precisa ser instalado nessa organização, e não só numa conta pessoal. Isso exige permissão de dono (owner) da organização.
3. Preencha:

| Campo | Valor |
|---|---|
| Language / Runtime | **Docker** |
| Branch | `main` |
| Region | **Oregon** (a mesma do banco) |
| Root Directory | `backend` ou `backend/` |
| Instance Type | **Free** |

   Se aparecerem os campos **Dockerfile Path** e **Docker Build Context Directory**, use `./Dockerfile` e `.` (relativos ao Root Directory). Vazios também funcionam.

4. Em **Environment Variables**, adicione:

| Nome | Valor |
|---|---|
| `ConnectionStrings__Default` | a connection string do passo 1.3 (linha inteira) |
| `Jwt__Key` | texto aleatório com 32 ou mais caracteres (gere um novo, não use o do repositório) |
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `PORT` | `8080` |

   `ConnectionStrings__Default` e `Jwt__Key` têm **dois** sublinhados. Para gerar a `Jwt__Key`, rode no PowerShell:

```powershell
[Convert]::ToBase64String((1..48 | % { Get-Random -Max 256 }))
```

5. Em **Advanced**, coloque `/health` no **Health Check Path**.
6. Clique em **Create Web Service** e acompanhe a aba **Logs**. O esperado é:
   - cinco linhas `Applying migration '...'` (só no primeiro deploy);
   - `Now listening on: http://[::]:8080`;
   - `Your service is live`.
7. Anote a URL do serviço (por exemplo, `https://registrossaude.onrender.com`) e confira no navegador:
   - `https://<url>/health` deve responder `{"status":"ok"}`;
   - `https://<url>/api/publico/colmeias` deve responder `[]` (banco conectado e vazio).

Se o deploy falhar, a causa aparece na aba **Logs**. As mais comuns são erro de digitação na connection string (usuário sem o prefixo, `<` `>` esquecidos) e senha errada.

## 3. Frontend (Vercel)

1. Entre em https://vercel.com com a conta do projeto.
2. Clique em **Add New > Project** e importe `abelhassenai/RegistrosSaude`.
3. Confira:
   - **Branch:** `main`;
   - **Root Directory:** `frontend`;
   - **Application Preset / Framework:** Next.js (detectado sozinho).
4. Em **Environment Variables**, adicione `API_INTERNAL_URL` com a URL do Render, **sem barra no final** (por exemplo, `https://registrossaude.onrender.com`), para **Production and Preview**.
   - Adicione a variável **antes** de clicar em Deploy. Ela é lida durante o build. Se for adicionada ou alterada depois, é preciso fazer um novo deploy no Vercel.
5. Não é preciso mexer em **Build and Output Settings**.
6. Clique em **Deploy** e abra a URL gerada.

## 4. Primeiro administrador

O banco começa vazio e o sistema não cria nenhum administrador. Além disso, o formulário de cadastro do site só aceita instituições que já existem: a lista de instituições é formada pelos nomes das colmeias cadastradas, e só um admin cadastra colmeias. Num banco novo, ninguém consegue se cadastrar pelo site. Por isso o primeiro admin é criado em três passos:

### 4.1 Cadastrar-se pela API

O backend aceita qualquer texto no campo instituição. O script [`scripts/cadastrar-primeiro-admin.ps1`](../scripts/cadastrar-primeiro-admin.ps1) pergunta os dados um por um e envia o cadastro direto para a API. A senha fica escondida enquanto você digita.

No terminal (cmd ou PowerShell), na raiz do repositório:

```
powershell -ExecutionPolicy Bypass -File scripts\cadastrar-primeiro-admin.ps1
```

Se a URL do Render for diferente de `https://registrossaude.onrender.com`, informe-a:

```
powershell -ExecutionPolicy Bypass -File scripts\cadastrar-primeiro-admin.ps1 -Api https://sua-url.onrender.com
```

Se o backend estiver dormindo, o envio pode levar até um minuto. Ao final, o script mostra "Cadastro criado" e o comando SQL do próximo passo.

### 4.2 Promover a conta a admin

No **SQL Editor** do TiDB, execute (troque o e-mail):

```sql
UPDATE colmeia.Usuario SET permissao = 'Admin', aprovado = 1 WHERE email = 'seu@email.com';
```

### 4.3 Cadastrar as colmeias

Faça login no site e cadastre as colmeias em **/admin/colmeias**. Os nomes das colmeias passam a aparecer como instituições no formulário de cadastro, e a partir daí os outros usuários se cadastram pelo site. Os cadastros novos ficam aguardando aprovação na área **/admin**.

## 5. Manter o backend acordado (UptimeRobot)

No plano grátis do Render o backend dorme após 15 minutos sem acesso, e o primeiro acesso depois disso demora cerca de um minuto. Para evitar:

1. Entre em https://uptimerobot.com com a conta do projeto.
2. Crie um monitor:
   - **Monitor Type:** HTTP(s);
   - **URL:** `https://<url-do-render>/health`;
   - **Monitoring Interval:** 5 minutos.
3. Salve. Em alguns minutos o monitor deve aparecer como **Up**.

O `/health` não consulta o banco, então o monitor não gasta a cota do TiDB.

## 6. Conferência final

- [ ] `https://<url-do-render>/health` responde `{"status":"ok"}`.
- [ ] O site do Vercel abre e mostra as páginas públicas.
- [ ] O login do primeiro admin funciona e a área **/admin** abre.
- [ ] Existe pelo menos uma colmeia cadastrada, e o formulário de cadastro mostra instituições.
- [ ] O monitor do UptimeRobot está **Up**.
- [ ] A `Jwt__Key` do Render foi gerada agora (não é a do `appsettings.json`).
- [ ] A senha do TiDB não foi compartilhada por chat ou e-mail. Se foi, troque.
