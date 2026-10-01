import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Unbounded } from "next/font/google"
import { Providers } from "@/components/providers"
import { THEME_SCRIPT } from "@/lib/theme-script"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Parley",
  description: "A chat interface from deep space for your local Ollama models.",
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f6fd" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b1a" },
  ],
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${unbounded.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="h-full overflow-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
