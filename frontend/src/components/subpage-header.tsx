import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit2, X, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Separator } from './ui/separator'


export function SubpageHeader({subpageItem, isEditing, setIsEditing, formData, setFormData , handleInputChange, handleSave} ) {

return (
    <>
<div className="flex items-center gap-4 bg-background/95 px-6 py-4 backdrop-blur z-10 shrink-0">
        <Button
          onClick={() => router.history.back()}
          variant="ghost"
          size="icon"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <Input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="h-8"
              />
            ) : (
              <h1 className="text-xl font-bold tracking-tight">
                {subpageItem.name}
              </h1>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              size="sm"
            >
              <Edit2 className="mr-2 h-4 w-4" /> Edit
            </Button>
          ) : (
            <>
              <Button
                onClick={() => {
                  setFormData({ ...subpageItem })
                  setIsEditing(false)
                }}
                variant="ghost"
                size="sm"
              >
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button onClick={handleSave} variant="default" size="sm">
                <Check className="mr-2 h-4 w-4" /> Save
              </Button>
            </>
          )}
        </div>
      </div>
      <Separator />
      </>
    )
}