import { isAxiosError } from 'axios'
import { PageNotFound } from './page-not-found'
import { SomethingWentWrong } from './something-went-wrong'
import type { ErrorComponentProps } from '@tanstack/react-router'

export function GlobalRouteError({ error, reset }: ErrorComponentProps) {
  if (isAxiosError(error)) {
    const status = error.response?.status

    if (status === 404 || status === 403) {
      return <PageNotFound />
    }
  }

  return <SomethingWentWrong error={error} reset={reset} />
}
