import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mareeba Badminton Club',
  description: 'Book sessions and manage your bookings at Mareeba Badminton Club',
  icons: {
    icon: '/mb-logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full bg-gray-50">
      <head>
        <link rel="icon" href="/mb-logo.png" />
      </head>
      <body className="h-full">
        {children}
      </body>
    </html>
  )
}