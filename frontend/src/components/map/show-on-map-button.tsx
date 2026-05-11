import { Map as MapIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

interface ShowOnMapButtonProps {
  roomId: string | number
  equipmentId: string | number
  type?: 'rack' | 'machine' | 'lab'
  className?: string
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function ShowOnMapButton({
  roomId,
  equipmentId,
  type = 'rack',
  className,
  variant = 'outline',
  size = 'sm',
}: ShowOnMapButtonProps) {
  return (
    <Button variant={variant} size={size} className={className} asChild>
      <Link
        to="/map"
        search={{
          roomId: Number(roomId),
          redirectId: String(equipmentId),
          redirectType: type,
        }}
      >
        <MapIcon className="w-4 h-4 mr-2" />
        Show on Map
      </Link>
    </Button>
  )
}
