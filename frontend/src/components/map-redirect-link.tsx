import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import type { MapSearch } from '@/routes/_auth/map'

interface MapLinkProps {
  redirectType?: MapSearch['redirectType']
  redirectId?: number | string
  children: ReactNode
  className?: string
}

export function MapRedirectLink({
  redirectType,
  redirectId,
  children,
  className,
}: MapLinkProps) {
  return (
    <Link
      to="/map"
      search={{
        redirectType,
        redirectId,
      }}
      className={className}
    >
      {children}
    </Link>
  )
}
