import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function SubpageCard({
  title,
  description,
  content,
  isEditing,
  type,
  Icon,
}) {
  const contentStyle =
    type === 'table'
      ? 'p-5'
      : type === 'info'
        ? 'grid gap-6 sm:grid-cols-2'
        : ''
  return (
    <Card className="pt-0">
      <CardHeader className="px-6 py-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {Icon && (
              <Icon className="h-5 w-5 text-muted-foreground text-primary" />
            )}
            {title}
          </CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className={contentStyle}>{content}</CardContent>
    </Card>
  )
}
