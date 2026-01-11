import { Button } from './ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card'
import { Field, FieldGroup, FieldLabel } from './ui/field'
import { Input } from './ui/input'
import { cn } from '@/lib/utils'

interface LoginFormProps extends Omit<React.ComponentProps<'div'>, 'onSubmit'> {
  onSubmit: (evt: React.FormEvent<HTMLFormElement>) => void
}

export function LoginForm({ className, onSubmit, ...props }: LoginFormProps) {
  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your username below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <FieldGroup>
              <FieldLabel htmlFor="username-input">Username</FieldLabel>
              <Input
                id="username-input"
                name="username"
                placeholder="Enter your name"
                type="text"
                required
              />
              <Field>
                <Button type="submit">Login</Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
