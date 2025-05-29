'use client'

import Link from 'next/link'

export default function Navigation() {
  return (
    <nav className="bg-blue-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold hover:text-blue-200">
          Home
        </Link>
        <div className="space-x-4">
          <Link href="/register" className="hover:text-blue-200">
            Register
          </Link>
          <Link href="/book" className="hover:text-blue-200">
            Book Session
          </Link>
        </div>
      </div>
    </nav>
  )
} 