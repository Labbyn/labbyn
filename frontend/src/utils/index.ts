// Helper functions

// time converter
export function convertTimestampToDate(timestamp) {
  return new Date(timestamp).toLocaleString('en-CA', {
    hour12: false,
  })
}

// string concat
export function addTextToString(text, textToAdd) {
  if (text) {
    return `${text} ${textToAdd}`
  } else {
    return '-'
  }
}

// zod validate
export function zodValidate(schema: z.ZodType<any>) {
  return ({ value }: { value: any }) => {
    const result = schema.safeParse(value)
    if (!result.success) {
      return { message: result.error.errors[0].message }
    }
    return undefined
  }
}
