// Protege /painel/**: sem sessão (401/403 em auth/me) vai para /entrar. No SSR repassa os cookies (useApi).
export default defineNuxtRouteMiddleware(async () => {
  const { carregar } = useSessao()
  const sessao = await carregar()
  if (!sessao) return navigateTo('/entrar')
})
