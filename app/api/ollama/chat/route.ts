import { ollamaBaseUrl, unreachable } from "@/lib/ollama-server"

/**
 * Thin proxy to Ollama's `/api/chat`. The response body is piped straight
 * through, and the request's abort signal is forwarded so that stopping a
 * generation in the browser also stops it in Ollama.
 */
export async function POST(request: Request) {
  const body = await request.text()

  let upstream: Response
  try {
    upstream = await fetch(`${ollamaBaseUrl()}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: request.signal,
      cache: "no-store",
    })
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 })
    return unreachable(error)
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ?? "application/x-ndjson",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  })
}
