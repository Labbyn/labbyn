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
