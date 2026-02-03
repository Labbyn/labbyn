import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from '@/components/ui/input-group'

interface TextFieldProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  maxChars?: number
}

export function TextField({ value, onChange, maxChars = 500 }: TextFieldProps) {
  const charsLeft = maxChars - value.length

  return (
    <InputGroup>
      <InputGroupTextarea
        name="note"
        placeholder="Enter your note"
        value={value}
        onChange={onChange}
        maxLength={maxChars}
      />
      <InputGroupAddon align="block-end">
        <InputGroupText className="text-muted-foreground text-xs">
          {charsLeft} characters left
        </InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  )
}
