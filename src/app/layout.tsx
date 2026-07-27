import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

// tailwind.config.js sets fontFamily.sans to var(--font-inter). Without this the
// variable is never defined, the font-family declaration is invalid, and the whole
// site falls back to the browser default (Times New Roman).
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Mareeba Badminton Club',
  description: 'Register and book badminton sessions in Mareeba',
  icons: {
    icon: '/mb-logo.png',
    shortcut: '/mb-logo.png',
    apple: '/mb-logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="icon" href="/mb-logo.png" type="image/png" />
        <link rel="shortcut icon" href="/mb-logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/mb-logo.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body>{children}</body>
    </html>
  )
}