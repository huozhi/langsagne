import type { Metadata } from 'next'
import localFont from 'next/font/local'
import type { ReactNode } from 'react'
import './globals.css'

const departureMono = localFont({
  src: './fonts/DepartureMono-Regular.woff2',
  display: 'swap',
  fallback: ['ui-monospace', 'monospace'],
  variable: '--font-departure-mono',
})

export const metadata: Metadata = {
  title: 'langsagne',
  description: 'minimal programming language parser and execution experiment',
}

type LayoutProps = {
  children: ReactNode
}

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html lang="en">
      <body className={`${departureMono.className} ${departureMono.variable}`}>
        <div className="mx-auto min-h-screen w-full max-w-[920px] px-5 pb-12 max-md:pb-8">
          <header className="border-b border-line py-6 pb-4 mb-4 max-md:py-4 max-md:pb-3">
            <h1 className="m-0 text-[clamp(2.75rem,11vw,4rem)] leading-none font-normal tracking-tight [&_code]:bg-transparent [&_code]:text-[length:inherit] [&_code]:text-inherit">
              <code><span className="title-cursor">lang</span>sagne</code>
            </h1>
            <p className="mt-2.5 text-sm leading-snug tracking-wide text-muted">
              minimal programming language parser and execution experiment
            </p>
          </header>
          <main>{children}</main>
          <footer className="mt-8 border-t border-line pt-4 text-sm leading-snug text-muted">
            <a
              className="underline decoration-line underline-offset-2 hover:text-fg"
              href="https://github.com/huozhi"
              target="_blank"
              rel="noreferrer"
            >
              github
            </a>
            <span className="mx-2">.</span>
            <a
              className="underline decoration-line underline-offset-2 hover:text-fg"
              href="https://x.com/huozhi"
              target="_blank"
              rel="noreferrer"
            >
              huozhi
            </a>
          </footer>
        </div>
      </body>
    </html>
  )
}
