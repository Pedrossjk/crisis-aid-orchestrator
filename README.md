# Crisis Aid Orchestrator

> Plataforma de resposta a crises humanitárias que conecta voluntários a ONGs usando matching inteligente alimentado pelo **IBM watsonx Orchestrate**.

Projeto desenvolvido para o IBM TechXchange Hackathon 2026.

---

## Sumário

- [Visão geral](#visão-geral)
- [O papel do IBM watsonx Orchestrate](#o-papel-do-ibm-watsonx-orchestrate)
- [Arquitetura](#arquitetura)
- [Stack tecnológica](#stack-tecnológica)
- [Rodando localmente](#rodando-localmente)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Banco de dados (Supabase)](#banco-de-dados-supabase)
- [Deploy na Cloudflare](#deploy-na-cloudflare)
- [API do Agente](#api-do-agente)
- [Fluxos principais](#fluxos-principais)

---

## Visão geral

Em situações de crise (enchentes, deslizamentos, emergências humanitárias), ONGs precisam mobilizar voluntários certos rapidamente — e voluntários precisam encontrar onde sua ajuda é mais necessária. O **Crisis Aid Orchestrator** resolve esse gargalo em dois papéis:

| Papel | O que pode fazer |
|---|---|
| **Voluntário** | Ver feed personalizado de ações, ver no mapa, se candidatar, receber notificações e convites de ONGs |
| **ONG** | Publicar ações de crise, gerenciar candidaturas, cadastrar recursos, ver matches com outras ONGs, colaborar em rede |

---

## O papel do IBM watsonx Orchestrate

O Orchestrate é o **cérebro de matching** da plataforma. Ele não é um chatbot genérico — ele executa fluxos autônomos chamando Skills específicas expostas como endpoints HTTP da aplicação.

### Skills registradas no Orchestrate

O agente importa as Skills via OpenAPI em:

```
GET /api/agent/openapi
```

ou pelo arquivo estático em [`/public/agent-openapi.json`](./public/agent-openapi.json).

#### Skill 1 — `matchVolunteersForAction`

```
GET /api/agent/match-volunteers/:actionId
```

**Quando é usado:** Quando uma ONG cria ou atualiza uma ação de crise.

**O que faz:**
1. Busca o perfil de todos os voluntários cadastrados no banco
2. Para cada voluntário, calcula um **score de compatibilidade 0–100** usando o algoritmo de matching em [`src/lib/matching.ts`](./src/lib/matching.ts):
   - **40%** — Jaccard similarity entre `help_types` do voluntário e da ação
   - **30%** — confiabilidade interna do voluntário (ajustada pela urgência da ação)
   - **15%** — avaliação pública (0–5 estrelas)
   - **15%** — proximidade geográfica via fórmula de Haversine
3. Retorna os voluntários ordenados por score com uma frase de razão legível

**Exemplo de resposta:**
```json
{
  "actionId": "uuid",
  "actionTitle": "Distribuição de alimentos — Blumenau",
  "matches": [
    {
      "volunteerId": "uuid",
      "name": "Ana Lima",
      "score": 87,
      "reason": "85% de compatibilidade de habilidades, alta confiabilidade, apenas 3.2 km de distância",
      "breakdown": { "helpTypeScore": 85, "reliabilityScore": 92, "ratingScore": 80 }
    }
  ]
}
```

#### Skill 2 — `recommendActionsForVolunteer`

```
GET /api/agent/recommend/:volunteerId?lat=<lat>&lon=<lon>&limit=10
```

**Quando é usado:** Ao carregar o feed do voluntário (`/volunteer/`).

**O que faz:** Inverte o matching — em vez de buscar voluntários para uma ação, busca as ações mais relevantes para o perfil do voluntário. O score combina compatibilidade de habilidades + proximidade + urgência. O resultado aparece no feed como "Recomendadas pelo agente".

#### Skill 3 — `getCoverageGaps`

```
GET /api/agent/coverage-gaps?threshold=60&urgency=high
```

**Quando é usado:** Monitoramento proativo pelo Orchestrate.

**O que faz:** Retorna ações cujo preenchimento de vagas está abaixo do limiar (`threshold`). Permite que o Orchestrate dispare alertas automáticos para ONGs quando uma ação de alta urgência está com menos de 60% das vagas preenchidas.

#### Skill 4 — `inviteVolunteerToAction`

```
POST /api/agent/invite
```

**Quando é usado:** Após o Orchestrate identificar um bom match via `matchVolunteersForAction`.

**O que faz:** Cria uma notificação no banco para o voluntário indicado — o convite aparece no sino de notificações do voluntário em tempo real.

### Fluxo completo do Orchestrate

```
ONG publica ação
       │
       ▼
Orchestrate chama matchVolunteersForAction(actionId)
       │
       ▼
Recebe lista de voluntários ranqueados por score
       │
       ├─ score ≥ 80 → chama inviteVolunteerToAction para cada um
       │
       └─ coverage < 60% → alerta a ONG via getCoverageGaps
```

O feed personalizado do voluntário (`/volunteer/`) também chama `recommendActionsForVolunteer` automaticamente ao abrir a página — o agente responde com as ações mais compatíveis, que aparecem com o badge "Recomendada pela IA".

### Autenticação com o Orchestrate

Os endpoints aceitam dois tipos de autenticação:

```
Authorization: Bearer <AGENT_API_KEY>   ← usado pelo Orchestrate
Authorization: Bearer <JWT Supabase>    ← usado pelo browser autenticado
```

Configure `AGENT_API_KEY` nas variáveis de ambiente (ver seção abaixo).

---

## Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                  Browser (React 19)                 │
│  TanStack Router + TanStack Start (file-based SSR)  │
│  Shadcn/ui + Tailwind CSS 4                         │
└─────────────┬───────────────────────┬───────────────┘
              │ HTTPS                 │ WebSocket / REST
              ▼                       ▼
┌─────────────────────┐   ┌──────────────────────────┐
│  Cloudflare Workers │   │  Supabase (PostgreSQL)   │
│  (Edge runtime)     │   │  Auth · RLS · Realtime   │
│  /api/agent/*       │   │  Storage                 │
└─────────┬───────────┘   └──────────────────────────┘
          │ Skills (OpenAPI)
          ▼
┌─────────────────────────────────────────────────────┐
│              IBM watsonx Orchestrate                │
│  matchVolunteersForAction                           │
│  recommendActionsForVolunteer                       │
│  getCoverageGaps                                    │
│  inviteVolunteerToAction                            │
└─────────────────────────────────────────────────────┘
```

---

## Stack tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | React 19, TanStack Router, TanStack Start |
| Estilo | Tailwind CSS 4, Shadcn/ui, Radix UI |
| Backend | Cloudflare Workers (Edge, sem servidor) |
| Banco de dados | Supabase (PostgreSQL + Auth + RLS + Realtime) |
| IA / Agente | IBM watsonx Orchestrate |
| Algoritmo de matching | Jaccard similarity + Haversine + pesos configuráveis |
| Build | Vite 6, pnpm |

---

## Rodando localmente

### Pré-requisitos

- Node.js ≥ 18
- pnpm (`npm install -g pnpm`)
- Conta Supabase (gratuita)

### 1. Clone e instale dependências

```bash
git clone https://github.com/seu-usuario/crisis-aid-orchestrator.git
cd crisis-aid-orchestrator
pnpm install
```

### 2. Configure as variáveis de ambiente

Copie o exemplo e preencha:

```bash
cp .env.example .env
```

Ver seção [Variáveis de ambiente](#variáveis-de-ambiente) para detalhes.

### 3. Crie as tabelas no Supabase

Execute os arquivos de migração no SQL Editor do Supabase **na ordem**:

```sql
-- 1. Seed inicial (perfis, voluntários, ONGs, ações)
supabase/seed.sql

-- 2. Chat entre ONG e voluntário
supabase/migration_applications_chat.sql

-- 3. Notificações de convites
supabase/migration_notifications.sql

-- 4. Recursos das ONGs
supabase/migration_ngo_resources.sql      (se existir)

-- 5. Ofertas de ajuda entre ONGs
supabase/migration_help_offers.sql
```

### 4. Inicie o servidor de desenvolvimento

```bash
pnpm dev
```

O app estará em `http://localhost:8080`.

### Contas de teste (seed)

Após rodar o `seed.sql`, use estas credenciais no Supabase Auth:

| Papel | E-mail | Senha |
|---|---|---|
| Voluntário | voluntario@demo.com | demo1234 |
| ONG | ong@demo.com | demo1234 |

> Crie as contas manualmente em **Supabase → Authentication → Users** e rode o seed para associar os perfis.

---

## Variáveis de ambiente

Crie o arquivo `.env` na raiz do projeto:

```env
# Supabase — obtenha em Settings → API do seu projeto
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIs...   # anon/public key

# Supabase service role — apenas no servidor (Worker), NUNCA expor no browser
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# Chave que o IBM Orchestrate usa para chamar os endpoints /api/agent/*
# Gere qualquer string segura: openssl rand -hex 32
AGENT_API_KEY=sua-chave-secreta-aqui

# URL pública da aplicação (usada na spec OpenAPI servida ao Orchestrate)
PUBLIC_APP_URL=https://seu-app.workers.dev
```

> Em desenvolvimento local, `AGENT_API_KEY` pode ser omitido — os endpoints ficam abertos.

---

## Banco de dados (Supabase)

### Tabelas principais

| Tabela | Descrição |
|---|---|
| `profiles` | Dados públicos do usuário (nome, cidade, bio) |
| `volunteers` | Perfil estendido do voluntário (skills, rating, reliability) |
| `ngos` | Perfil da ONG (nome, cidade, missão) |
| `user_roles` | Papel do usuário: `volunteer` ou `ong` |
| `crisis_actions` | Ações de crise publicadas pelas ONGs |
| `action_applications` | Candidaturas de voluntários às ações |
| `chat_messages` | Chat entre ONG e voluntário por candidatura |
| `notifications` | Convites e notificações recebidos pelo voluntário |
| `ngo_resources` | Recursos disponíveis das ONGs (para matching inter-ONG) |
| `ngo_help_offers` | Ofertas de ajuda entre ONGs geradas pelo matching de recursos |

### Row Level Security (RLS)

Todas as tabelas têm RLS ativo. Cada usuário vê e modifica apenas seus próprios dados. O agente IBM usa `service_role` (bypass de RLS) via `SUPABASE_SERVICE_ROLE_KEY`.

---

## Deploy na Cloudflare

O app roda na **Cloudflare Workers** — edge runtime global, sem servidor dedicado.

### 1. Instale o Wrangler

```bash
pnpm add -g wrangler
wrangler login
```

### 2. Configure os segredos no Worker

```bash
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put AGENT_API_KEY
wrangler secret put PUBLIC_APP_URL
```

> `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` ficam no bundle do frontend — configure em `wrangler.jsonc` como `vars` ou inclua no `.env` antes do build.

### 3. Build e deploy

```bash
pnpm build
npx wrangler deploy
```

O Wrangler detecta automaticamente o entry point via `"main": "@tanstack/react-start/server-entry"` configurado em `wrangler.jsonc`.

### 4. URL de produção

Após o deploy, o Wrangler exibe a URL:

```
https://tanstack-start-app.<seu-subdominio>.workers.dev
```

Atualize `PUBLIC_APP_URL` com essa URL e faça o redeploy.

---

## API do Agente

Todos os endpoints ficam sob `/api/agent/` e aceitam `Authorization: Bearer <AGENT_API_KEY>`.

### Importar Skills no Orchestrate

1. No painel do IBM watsonx Orchestrate, acesse **Skills → Add skills → Import from API**
2. Cole a URL da spec:
   ```
   https://seu-app.workers.dev/api/agent/openapi
   ```
3. Informe a `AGENT_API_KEY` como Bearer token
4. As 4 Skills são importadas automaticamente

### Endpoints disponíveis

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/agent/match-volunteers/:actionId` | Voluntários ranqueados para uma ação |
| `GET` | `/api/agent/recommend/:volunteerId` | Ações recomendadas para um voluntário |
| `GET` | `/api/agent/coverage-gaps` | Ações com vagas insuficientes |
| `POST` | `/api/agent/invite` | Envia convite de ONG para voluntário |
| `GET` | `/api/agent/openapi` | Spec OpenAPI 3.0 para o Orchestrate |

---

## Fluxos principais

### Voluntário

```
Cadastro → Onboarding (skills, cidade) → Feed personalizado (IA)
  → Detalhe da ação → Candidatura → Chat com a ONG
  → Notificações de convites enviados pelo Orchestrate
  → Mapa interativo com distâncias em km
```

### ONG

```
Cadastro → Publicar ação (urgência, tipo de ajuda, vagas)
  → Receber candidaturas → Aceitar/Rejeitar → Chat com voluntário
  → Cadastrar recursos disponíveis → Ver matches com ações de outras ONGs
  → Enviar oferta de ajuda → Ver rede de colaboração
  → Marcar ação como concluída
```

### Matching automático (Orchestrate)

```
ONG publica ação
  → Orchestrate detecta via skill
  → Executa matchVolunteersForAction
  → Para cada voluntário com score ≥ 80: inviteVolunteerToAction
  → Voluntário recebe notificação em tempo real
  → Feed do voluntário atualiza com a ação no topo
```
