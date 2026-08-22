const PUBLIC_ROUTES = new Set(["/login", "/register"]);
const PLATFORM_LOGIN = "/platform/login";

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return;

  // Платформенный раздел живёт на своей сессии и своём маршруте входа.
  if (to.path.startsWith("/platform")) {
    const platform = usePlatformAuthStore();
    await platform.restore();

    if (to.path === PLATFORM_LOGIN) {
      if (platform.isAuthenticated && platform.admin) return navigateTo("/platform");
      return;
    }
    if (!platform.isAuthenticated || !platform.admin) {
      platform.clear();
      return navigateTo(PLATFORM_LOGIN);
    }
    return;
  }

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