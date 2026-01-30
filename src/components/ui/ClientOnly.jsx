'use client'
import { useEffect, useState } from 'react'

export function ClientOnly({ children, fallback = null }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return fallback
  return children
}
