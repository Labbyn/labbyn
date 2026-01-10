import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import React from 'react'
import { z } from 'zod'
import { useAuth } from '@/routes/auth'
import { LoginForm } from '@/components/login-form'

const fallback = '/' as const

export const Route = createFileRoute('/login')({
  validateSearch: z.object({
    redirect: z.string().optional().catch(''),
  }),
  beforeLoad: ({ context, search }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: search.redirect || fallback })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const auth = useAuth()
  const router = useRouter()
  const navigate = Route.useNavigate()

  const search = Route.useSearch()

  const onFormSubmit = async (evt: React.FormEvent<HTMLFormElement>) => {
    evt.preventDefault()
    const data = new FormData(evt.currentTarget)
    const fieldValue = data.get('username')

    if (!fieldValue) return

    try {
      const username = fieldValue.toString()

      await auth.login(username)
      await router.invalidate()

      await navigate({ to: search.redirect || fallback })
    } catch (error) {
      console.error('Error logging in: ', error)
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center p-4">
      <LoginForm onSubmit={onFormSubmit} className="w-full max-w-sm" />
    </div>
  )
}
