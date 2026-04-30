export async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  try {
    return JSON.parse(text) as T;
  } catch {
    const snippet = text.replace(/\s+/g, " ").trim().slice(0, 140);
    throw new Error(
      `Expected JSON from ${response.url || "request"} but got ${response.status} ${response.statusText || "response"}${snippet ? `: ${snippet}` : ""}`
    );
  }
}
