import type { Metadata } from 'next'
import './globals.css'

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
    <html lang="en">
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