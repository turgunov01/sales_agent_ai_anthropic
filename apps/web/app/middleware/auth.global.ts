const PUBLIC_ROUTES = new Set(["/login", "/register"]);

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return;

  const auth = useAuthStore();
  await auth.restore();

  if (PUBLIC_ROUTES.has(to.path)) {
    if (auth.isAuthenticated) return navigateTo("/");
    return;
  }

  if (!auth.isAuthenticated) {
    return navigateTo({ path: "/login", query: to.path === "/" ? {} : { redirect: to.path } });
  }
});