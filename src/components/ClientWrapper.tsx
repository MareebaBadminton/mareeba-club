'use client'

import { useEffect } from 'react'
import { initializeStorage } from '@/lib/utils/storage'

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    initializeStorage()
  }, [])

  return <>{children}</>
} 