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
  title: 'lang vm demo',
  description: 'step through tokens, directives, and VM state',
}

type LayoutProps = {
  children: ReactNode
}

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html lang="en">
      <body className={`${departureMono.className} ${departureMono.variable}`}>
        <div className="site-shell">
          <header>
            <h1>
              <code>lang</code>
            </h1>
            <p className="tagline">step through source, directives, VM state, then tokens</p>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  )
}
