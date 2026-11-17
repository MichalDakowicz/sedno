type JsonObjectResult =
  | { data: Record<string, unknown> }
  | { status: 400 | 413; error: "bad_json" | "too_large" };

/** Liczy bajty przed sklejeniem tekstu, także gdy klient nie podaje Content-Length. */
export async function readJsonObject(req: Request, maxBytes: number): Promise<JsonObjectResult> {
  const badJson = { status: 400, error: "bad_json" } as const;
  if (!req.body) return badJson;

  const reader = req.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const chunks: string[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        void reader.cancel().catch(() => {});
        return { status: 413, error: "too_large" };
      }
      chunks.push(decoder.decode(value, { stream: true }));
    }
    chunks.push(decoder.decode());
    const data: unknown = JSON.parse(chunks.join(""));
    if (data === null || typeof data !== "object" || Array.isArray(data)) return badJson;
    return { data: data as Record<string, unknown> };
  } catch {
    void reader.cancel().catch(() => {});
    return badJson;
  } finally {
    reader.releaseLock();
  }
}
