import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

/** Tukar query tanpa scroll ke atas (penting untuk penapis di telefon). */
export function replaceWithSearchParams(
  router: AppRouterInstance,
  pathname: string,
  params: URLSearchParams,
) {
  const q = params.toString();
  router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
}
