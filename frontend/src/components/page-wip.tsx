import { useCanGoBack, useRouter } from '@tanstack/react-router'
import { Hammer } from 'lucide-react'
import { Button } from './ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'

export function PageWorkInProgress() {
  const router = useRouter()
  const canGoBack = useCanGoBack()

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Empty>
        <EmptyHeader>
          <div className="flex justify-center mb-4">
            <Hammer className="h-12 w-12 text-muted-foreground animate-bounce" />
          </div>
          <EmptyTitle>Under Construction</EmptyTitle>
          <EmptyDescription>
            This page is waiting to be developed.
          </EmptyDescription>
          <EmptyContent className="flex flex-row gap-2 justify-center">
            {canGoBack ? (
              <Button variant="outline" onClick={() => router.history.back()}>
                Go back
              </Button>
            ) : null}
            <Button onClick={() => router.navigate({ to: '/' })}>
              Return Home
            </Button>
          </EmptyContent>
        </EmptyHeader>
      </Empty>
    </div>
  )
}
