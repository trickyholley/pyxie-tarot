import { ApiError } from "@pyxie/api-client";

export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError && err.body && typeof err.body === "object" && "detail" in err.body) {
    const { detail } = err.body as { detail?: unknown };
    if (typeof detail === "string") return detail;
  }
  return fallback;
}
