export function PageHeader({ title, description, icon: Icon }) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
        {Icon && <Icon className="h-6 w-6 text-primary" />}
        {title}
      </h1>
      <p className="text-muted-foreground text-sm">{description}</p>
    </header>
  )
}
