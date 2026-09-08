export const AUTH_PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/auth",
] as const;

export function isAuthPublicPath(pathname: string) {
  return AUTH_PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}
