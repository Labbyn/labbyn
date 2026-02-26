import { Badge } from "@/components/ui/badge"
import type { ApiTagsResponse } from "@/integrations/tags/tags.types"


const colorMap = {
    red: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
    purple: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
    lightBlue: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
    green: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
}

export function TagList({ tags }: ApiTagsResponse) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return <span className="text-sm text-muted-foreground">No tags</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Badge 
          key={tag.id} 
          className={colorMap[tag.color]}
        >
          {tag.name}
        </Badge>
      ))}
    </div>
  );
}
