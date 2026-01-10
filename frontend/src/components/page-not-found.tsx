import { useCanGoBack, useRouter } from '@tanstack/react-router'
import { Button } from './ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'

export function PageNotFound() {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>404 - Not Found</EmptyTitle>
          <EmptyDescription>
            The page you&apos;re looking for doesn&apos;t exist.
          </EmptyDescription>
          <EmptyContent>
            {canGoBack ? (
              <Button onClick={() => router.history.back()}>Go back</Button>
            ) : null}
          </EmptyContent>
        </EmptyHeader>
      </Empty>
    </div>
  )
}
