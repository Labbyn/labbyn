import { useCanGoBack, useRouter } from '@tanstack/react-router'
import { Button } from './ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'

export function SomethingWentWrong() {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Something went wrong!</EmptyTitle>
          <EmptyDescription>The app has encountered an error.</EmptyDescription>
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
