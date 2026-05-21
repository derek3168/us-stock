export const dynamic = "force-dynamic";
export const revalidate = 0;

export function jsonNoStore<T>(data: T, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      ...(init?.headers as Record<string, string>),
    },
  });
}
