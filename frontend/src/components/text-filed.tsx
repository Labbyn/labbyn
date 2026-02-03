import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group"

interface TextFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  maxChars?: number;
}

export function TextField({ value, onChange, maxChars = 500 }: TextFieldProps) {
  const charsLeft = maxChars - (value?.length || 0);

  return (
    <InputGroup>
      <InputGroupTextarea 
        name = "note"
        placeholder="Enter your note" 
        value={value}
        onChange={onChange}
        maxLength={maxChars}
        className="min-h-[120px]"
      />
      <InputGroupAddon align="block-end">
        <InputGroupText className="text-muted-foreground text-xs">
          {charsLeft} characters left
        </InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  )
}