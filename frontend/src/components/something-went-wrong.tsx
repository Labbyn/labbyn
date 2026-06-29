import { useCanGoBack, useRouter } from '@tanstack/react-router'
import { Button } from './ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'

interface SomethingWentWrongProps {
  error?: Error
  reset?: () => void
}

export function SomethingWentWrong({ error, reset }: SomethingWentWrongProps) {
  const router = useRouter()
  const canGoBack = useCanGoBack()

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Something went wrong!</EmptyTitle>
          <EmptyDescription>
            {error?.message || 'The app has encountered an error.'}
          </EmptyDescription>
          <EmptyContent className="flex gap-2">
            {reset && (
              <Button onClick={reset} variant="outline">
                Try again
              </Button>
            )}
            {canGoBack ? (
              <Button onClick={() => router.history.back()}>Go back</Button>
            ) : null}
          </EmptyContent>
        </EmptyHeader>
      </Empty>
    </div>
  )
}
