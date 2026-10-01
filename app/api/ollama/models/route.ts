import { ollamaBaseUrl, unreachable } from "@/lib/ollama-server"

export async function GET() {
  const base = ollamaBaseUrl()
  try {
    const [tags, version] = await Promise.all([
      fetch(`${base}/api/tags`, { cache: "no-store" }),
      fetch(`${base}/api/version`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
    if (!tags.ok) {
      const body = await tags.json().catch(() => null)
      return Response.json(
        { error: body?.error ?? `Ollama responded with ${tags.status}` },
        { status: tags.status }
      )
    }
    const { models = [] } = await tags.json()
    return Response.json({ models, version: version?.version ?? null, host: base })
  } catch (error) {
    return unreachable(error)
  }
}
