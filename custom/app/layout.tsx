import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Web-Design Agent',
  description: 'AI-powered premium web design. No templates. No clichés.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="bg-zinc-950 text-zinc-100 h-full">
        {children}
      </body>
    </html>
  )
}
