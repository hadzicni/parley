"use client"

import {
  Children,
  createContext,
  isValidElement,
  memo,
  useContext,
  useMemo,
  type ReactNode,
} from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { marked } from "marked"
import { CodeBlock } from "@/components/chat/code-block"
import { cn } from "@/lib/utils"

const StreamingContext = createContext(false)

function Pre({ children }: { children?: ReactNode }) {
  const streaming = useContext(StreamingContext)
  const child = Children.toArray(children)[0]
  if (!isValidElement<{ className?: string; children?: ReactNode }>(child)) {
    return <pre>{children}</pre>
  }
  const lang = /language-([\w+#.-]+)/.exec(child.props.className ?? "")?.[1]
  const code = String(child.props.children ?? "").replace(/\n$/, "")
  return <CodeBlock code={code} lang={lang ?? ""} streaming={streaming} />
}

const components: Components = {
  pre: Pre,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="table-wrap scroll-thin">
      <table>{children}</table>
    </div>
  ),
}

const remarkPlugins = [remarkGfm]

const Block = memo(
  function Block({ source }: { source: string }) {
    return (
      <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
        {source}
      </ReactMarkdown>
    )
  },
  (a, b) => a.source === b.source
)

/** Split into top-level blocks so only the block being written re-renders. */
function splitBlocks(markdown: string) {
  try {
    return marked.lexer(markdown, { gfm: true }).map((token) => token.raw)
  } catch {
    return [markdown]
  }
}

export function Markdown({
  content,
  streaming = false,
  className,
}: {
  content: string
  streaming?: boolean
  className?: string
}) {
  const blocks = useMemo(() => splitBlocks(content), [content])
  return (
    <StreamingContext.Provider value={streaming}>
      <div className={cn("md", streaming && "md-streaming", className)}>
        {blocks.map((block, i) => (
          <Block key={i} source={block} />
        ))}
      </div>
    </StreamingContext.Provider>
  )
}
