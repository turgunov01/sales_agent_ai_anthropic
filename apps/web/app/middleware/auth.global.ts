const PUBLIC_ROUTES = new Set(["/login", "/register"]);

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return;

  const auth = useAuthStore();
  await auth.restore();

  if (PUBLIC_ROUTES.has(to.path)) {
    if (auth.isAuthenticated) return navigateTo("/");
    return;
  }

  // Сессия могла быть сброшена внутри restore(): токен есть, а профиль загрузить
  // не удалось — тогда это не вход, а мусор в localStorage.
  if (!auth.isAuthenticated || !auth.user) {
    auth.clear();
    return navigateTo({ path: "/login", query: to.path === "/" ? {} : { redirect: to.path } });
  }
});