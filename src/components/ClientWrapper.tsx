'use client'

import { useEffect, useState } from 'react'
import { initializeStorage } from '@/lib/utils/storage'

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    initializeStorage()
  }, [])

  if (!isClient) {
    return <div className="min-h-screen bg-gray-50">Loading...</div>
  }

  return <>{children}</>
} 