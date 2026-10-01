"use client"

import { memo, useEffect, useState, type CSSProperties } from "react"
import type { ThemedToken } from "shiki"
import { CopyButton } from "@/components/chat/copy-button"

type Highlighted = { code: string; tokens: ThemedToken[][] }

const LANGUAGE_NAMES: Record<string, string> = {
  js: "JavaScript",
  javascript: "JavaScript",
  jsx: "JSX",
  ts: "TypeScript",
  typescript: "TypeScript",
  tsx: "TSX",
  py: "Python",
  python: "Python",
  sh: "Shell",
  bash: "Bash",
  zsh: "Zsh",
  shell: "Shell",
  json: "JSON",
  html: "HTML",
  css: "CSS",
  md: "Markdown",
  markdown: "Markdown",
  rs: "Rust",
  rust: "Rust",
  go: "Go",
  sql: "SQL",
  yaml: "YAML",
  yml: "YAML",
  cpp: "C++",
  c: "C",
  cs: "C#",
  csharp: "C#",
  java: "Java",
  kotlin: "Kotlin",
  swift: "Swift",
  rb: "Ruby",
  ruby: "Ruby",
  php: "PHP",
  diff: "Diff",
  dockerfile: "Dockerfile",
  toml: "TOML",
}

async function tokenize(code: string, lang: string) {
  const shiki = await import("shiki")
  const known =
    lang in shiki.bundledLanguages || lang in shiki.bundledLanguagesAlias
  if (!known) return null
  const { tokens } = await shiki.codeToTokens(code, {
    lang: lang as keyof typeof shiki.bundledLanguages,
    themes: { light: "catppuccin-latte", dark: "poimandres" },
    defaultColor: false,
  })
  return tokens
}

/**
 * Syntax-highlighted code. While a reply is still streaming, highlighting is
 * debounced; the newest characters render plain until the next pass, so the
 * block grows smoothly instead of flickering.
 */
export const CodeBlock = memo(function CodeBlock({
  code,
  lang,
  streaming,
}: {
  code: string
  lang: string
  streaming: boolean
}) {
  const language = lang.toLowerCase()
  const [highlighted, setHighlighted] = useState<Highlighted | null>(null)

  useEffect(() => {
    if (!language) return
    let cancelled = false
    const timer = setTimeout(
      async () => {
        try {
          const tokens = await tokenize(code, language)
          if (!cancelled && tokens) setHighlighted({ code, tokens })
        } catch {
          // Unknown grammar or load failure: stay plain.
        }
      },
      streaming ? 140 : 0
    )
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [code, language, streaming])

  const usable = highlighted && code.startsWith(highlighted.code)
  const tail = usable ? code.slice(highlighted.code.length) : code

  return (
    <div className="code-block group/code overflow-hidden rounded-2xl border bg-code shadow-[0_16px_40px_-24px_rgb(0_0_0/0.6)]">
      <div className="flex h-9 items-center justify-between border-b bg-linear-to-r from-brand/10 via-transparent to-brand-2/10 pr-1.5 pl-3.5">
        <span className="flex items-center gap-2 font-mono text-[0.7rem] tracking-wide text-muted-foreground">
          <span className="flex gap-1">
            <span className="size-2 rounded-full bg-brand-3/70" />
            <span className="size-2 rounded-full bg-brand/70" />
            <span className="size-2 rounded-full bg-brand-2/70" />
          </span>
          {LANGUAGE_NAMES[language] ?? (language || "text")}
        </span>
        <CopyButton text={code} label="Copy code" size="icon-xs" />
      </div>
      <pre className="shiki scroll-thin">
        <code>
          {usable &&
            highlighted.tokens.map((line, i) => (
              <span key={i}>
                {line.map((token, j) => (
                  <span
                    key={j}
                    style={token.htmlStyle as CSSProperties | undefined}
                  >
                    {token.content}
                  </span>
                ))}
                {i < highlighted.tokens.length - 1 && "\n"}
              </span>
            ))}
          {tail}
        </code>
      </pre>
    </div>
  )
})
