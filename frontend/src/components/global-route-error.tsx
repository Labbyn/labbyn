import { isAxiosError } from 'axios'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { PageNotFound } from './page-not-found'
import { SomethingWentWrong } from './something-went-wrong'

export function GlobalRouteError({ error, reset }: ErrorComponentProps) {
  if (isAxiosError(error)) {
    const status = error.response?.status

    if (status === 404 || status === 403) {
      return <PageNotFound />
    }
  }

  return <SomethingWentWrong error={error as Error} reset={reset} />
}
