# Bellagenda-frontend

Projeto Integrador II (PJI240 - A2026S2N1 - Grupo 14). Frontend em Nuxt 4 + TypeScript.

Estado: esqueleto (FE-01). Sem CSS, tema ou fontes até a aprovação visual final.

## Como rodar

```
npm ci
cp .env.example .env   # ajuste se necessário
npm run dev            # http://localhost:3000
npm run build
npm run typecheck
```

## Variáveis

| Variável | Padrão | Uso |
| --- | --- | --- |
| `NUXT_BACKEND_URL` | `http://127.0.0.1:8000` | Destino do proxy de `/api/**` (Django), sem barra final. Lida em tempo de execução (`runtimeConfig` privado). |
| `NUXT_PROXY_SECRET` | vazio | Segredo enviado ao backend em `X-Bela-Proxy-Secret`. Só é enviado se existir. Privado: nunca vai ao navegador. |

O navegador só fala com o Nuxt; `/api/**` é repassado ao backend com o caminho completo (`/api/v1/...`), sem CORS.

### Proxy (`server/routes/api/[...path].ts`)

Proxy explícito em servidor (h3 `sendProxy`), no lugar do `routeRules` proxy, que na Vercel vira rewrite da plataforma e não deixa injetar cabeçalhos.

- Aceita todos os métodos, com ou sem barra final, e preserva caminho, query e corpo.
- Repassa só uma lista de permissão de cabeçalhos do navegador (`cookie`, `origin`, `referer`, `x-csrftoken`, `content-type`, `accept`, `user-agent` etc.). `x-forwarded-*` e qualquer `x-bela-*` do navegador são descartados (não podem ser forjados).
- Injeta `X-Bela-Proxy-Secret` (se `NUXT_PROXY_SECRET` existir), `X-Bela-Client-Ip` (nesta ordem: `x-vercel-forwarded-for`, `x-real-ip`, primeiro de `x-forwarded-for`, socket; só se for IP válido) e `x-forwarded-proto: https` quando a requisição original é https.
- `Set-Cookie` do backend volta ao navegador sem alterar atributos; redirecionamentos do Django voltam relativos.
- Tempo limite de 20 s: `504` e `502` em JSON `{code: "erro_gateway", message, fields: {}}`, sem expor o endereço interno nem o segredo. Cookies, tokens e segredo nunca são registrados em log.
- Só encaminha para caminhos `/api/` do backend (rejeita `..` e `//host`).

## Deploy na Vercel

1. Importe o repositório na Vercel; o preset do Nitro (`vercel`) é detectado automaticamente (`npm run build`). Branch de produção: a que o time definir (por exemplo `main`).
2. Em Settings > Environment Variables defina, para Production (e Preview, se for usar):
   - `NUXT_BACKEND_URL`: URL pública HTTPS do backend (sem barra final).
   - `NUXT_PROXY_SECRET`: o mesmo valor configurado no backend. Gere um valor longo e aleatório.
   As variáveis são lidas em tempo de execução: trocar o valor e fazer redeploy (ou novo deployment) basta, sem alterar o código.
3. No backend, `CSRF_TRUSTED_ORIGINS` e `ALLOWED_HOSTS` devem incluir o domínio da Vercel (`https://SEU-PROJETO.vercel.app`). O proxy repassa `Origin` e `Referer` originais.
4. Depois do deploy, confira:
   - `https://SEU-PROJETO.vercel.app/api/v1/saude/` responde `200`.
   - Login em `/entrar` (cookie `sessionid` e `csrftoken` gravados no domínio da Vercel).
   - Um agendamento completo em `/p/<slug>` e a consulta em `/p/<slug>/meu-agendamento`.
   - Limites de requisição por pessoa (o backend deve receber `X-Bela-Client-Ip`).

Limitações: o tempo limite do proxy é 20 s (e o da função na Vercel depende do plano); o IP vem de cabeçalhos da Vercel, então fora dela (outro host) só é confiável se um proxy confiável sobrescrever `x-forwarded-for`/`x-real-ip`; cada chamada passa por uma função serverless (latência extra).

## Rotas

- `/` landing mínima
- `/p/[slug]` agendamento público
- `/p/[slug]/meu-agendamento`
- `/entrar`
- `/painel`, `/cadastro`, `/termos`, `/privacidade`, `/backoffice`

`app/composables/useApi.ts`: helper `$fetch` para `/api/v1` (credenciais, `X-CSRFToken` em métodos não seguros, erros normalizados `{code, message, fields}`).
