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
| `NUXT_BACKEND_URL` | `http://127.0.0.1:8000` | Destino do proxy de `/api/**` (Django). Lida na inicialização/build. |

O navegador só fala com o Nuxt; `/api/**` é repassado ao backend com o caminho completo (`/api/v1/...`), sem CORS.

## Rotas

- `/` landing mínima
- `/p/[slug]` agendamento público (futuro)
- `/p/[slug]/meu-agendamento`
- `/entrar`
- `/painel`
- `/diagnostico` temporária (chama `/api/v1/saude/`); **remover antes de produção**

`app/composables/useApi.ts`: helper `$fetch` para `/api/v1` (credenciais, `X-CSRFToken` em métodos não seguros, erros normalizados `{code, message, fields}`).
