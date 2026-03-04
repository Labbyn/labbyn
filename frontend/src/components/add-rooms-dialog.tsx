import { useState } from 'react'
import { Loader2, Plus, Server } from 'lucide-react'
import { useForm } from '@tanstack/react-form'
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectGroup,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
} from '@/components/ui/multi-select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { SidebarMenuButton } from '@/components/ui/sidebar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useCreateLabMutation } from '@/integrations/labs/labs.mutation'
import { zodValidate } from '@/utils/index'
import { teamsQueryOptions } from '@/integrations/teams/teams.query'
import { tagsQueryOptions } from '@/integrations/tags/tags.query'

type RoomsFormValues = {
  name: string
  room_type: string
  team_id: number
  tag_ids?: Array<string>
}

const schemas = {
  name: z.string().min(1, 'Name is required'),
  room_type: z.string().min(1, 'Room type is required'),
  team_id: z.number().positive(),
}

export function AddRoomsDialog() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { data: teams } = useSuspenseQuery(teamsQueryOptions)
  const { data: tags } = useSuspenseQuery(tagsQueryOptions)

  const mutation = useMutation({
    mutationKey: ['create-lab'],
    mutationFn: useCreateLabMutation,
    onSuccess: () => {
      toast.success('Room added successfully')
      queryClient.invalidateQueries({ queryKey: ['labs'] })
      setOpen(false)
      form.reset()
    },
    onError: (error: Error) => {
      toast.error('Operation failed', { description: error.message })
    },
  })

  const form = useForm({
    defaultValues: {
      name: '',
      room_type: '',
      team_id: 0,
      tag_ids: [],
    } as RoomsFormValues,
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value)
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <SidebarMenuButton>
          <Server />
          <span>Add Room</span>
        </SidebarMenuButton>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add new room</DialogTitle>
          <DialogDescription>Create new room</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
        >
          <div className="max-h-[60vh] overflow-y-auto space-y-4 p-1 mb-6">
            {/* Room name, room_type, team name - Always Required */}
            {/* Display names, get ids as values - requierd in POST operation (team_id) */}
            <form.Field
              name="name"
              validators={{ onChange: zodValidate(schemas.name) }}
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Room Name</FieldLabel>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="e.g. LAB-01-03"
                    className={
                      field.state.meta.errors.length ? 'border-destructive' : ''
                    }
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            />
            <form.Field
              name="room_type"
              validators={{ onChange: zodValidate(schemas.room_type) }}
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Room Type</FieldLabel>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="e.g. Storage Room"
                    className={
                      field.state.meta.errors.length ? 'border-destructive' : ''
                    }
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            />
            <form.Field
              name="team_id"
              validators={{ onChange: zodValidate(schemas.team_id) }}
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Team Name</FieldLabel>
                  <Select
                    value={field.state.value.toString()}
                    onValueChange={(value) => field.handleChange(Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id.toString()}>
                          <div className="gap-2">
                            <span className="capitalize">{team.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
            <form.Field
              name="tag_ids"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Tags</FieldLabel>
                  <MultiSelect
                    values={field.state.value}
                    onValuesChange={(values) => {
                      field.handleChange(values)
                    }}
                  >
                    <MultiSelectTrigger className="w-full">
                      <MultiSelectValue placeholder="Select tags" />
                    </MultiSelectTrigger>
                    <MultiSelectContent>
                      <MultiSelectGroup>
                        {tags.map((tag) => (
                          <MultiSelectItem key={tag.id} value={String(tag.id)}>
                            {tag.name}
                          </MultiSelectItem>
                        ))}
                      </MultiSelectGroup>
                    </MultiSelectContent>
                  </MultiSelect>
                </Field>
              )}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit]}
              children={([canSubmit]) => (
                <Button
                  type="submit"
                  disabled={!canSubmit || mutation.isPending}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Plus />
                      Add Room
                    </>
                  )}
                </Button>
              )}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
