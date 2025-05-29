'use client'

import Image from 'next/image'

export default function Logo() {
  return (
    <div className="flex items-center gap-2">
      <Image
        src="/logo.png"
        alt="Mareeba Badminton Club Logo"
        width={40}
        height={40}
        className="rounded-full"
      />
      <span className="text-xl font-bold text-blue-600">Mareeba Badminton Club</span>
    </div>
  )
} 