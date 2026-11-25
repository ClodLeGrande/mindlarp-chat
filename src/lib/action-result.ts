export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string };

export function failure(error: unknown): ActionResult<never> {
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  return { ok: false, error: message };
}
