'use client'

import Image from 'next/image'
import { useState } from 'react'

export default function Logo() {
  const [imageError, setImageError] = useState(false)

  return (
    <div className="flex items-center gap-2">
      {!imageError ? (
        <Image
          src="/mb-logo.png"
          alt="Mareeba Badminton Club Logo"
          width={50}
          height={50}
          className="rounded-full"
          onError={() => setImageError(true)}
          priority
        />
      ) : (
        <div className="w-[50px] h-[50px] bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-blue-600 font-bold text-lg">MB</span>
        </div>
      )}
      <span className="text-xl font-bold text-blue-600">Mareeba Badminton Club</span>
    </div>
  )
} 