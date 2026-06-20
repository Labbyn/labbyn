export interface ParsedCSV {
  headers: Array<string>
  rows: Array<Array<string>>
}

export function parseCSV(text: string): ParsedCSV {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '')
  if (lines.length === 0) {
    return { headers: [], rows: [] }
  }

  const detectSeparator = (headerLine: string): string => {
    const candidates = [',', ';', '\t', '|']
    let bestSeparator = ','
    let maxCount = 0

    for (const candidate of candidates) {
      const count = headerLine.split(candidate).length - 1
      if (count > maxCount) {
        maxCount = count
        bestSeparator = candidate
      }
    }
    return bestSeparator
  }

  const separator = detectSeparator(lines[0])

  const parseRow = (row: string): Array<string> => {
    const result: Array<string> = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < row.length; i++) {
      const char = row[i]
      const nextChar = row[i + 1]

      if (char === '"' && inQuotes && nextChar === '"') {
        current += '"'
        i++
      } else if (char === '"') {
        inQuotes = !inQuotes
      } else if (!inQuotes && row.startsWith(separator, i)) {
        result.push(current.trim())
        current = ''
        i += separator.length - 1
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = parseRow(lines[0])
  const rows = lines.slice(1).map(parseRow)

  return { headers, rows }
}
