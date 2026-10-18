// Protege /backoffice/**: sem sessão vai para /entrar. Quem está logada sem ser superusuária vê um 404 amigável
// (a página decide); o backend responde 404 idêntico a qualquer pessoa que não seja superusuária.
export default defineNuxtRouteMiddleware(async () => {
  const { carregar } = useSessao()
  const sessao = await carregar()
  if (!sessao) return navigateTo('/entrar')
})
