export function normalizePlate(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function prettyPlate(value: string): string {
  const normalized = normalizePlate(value)
  if (normalized.length < 6) return normalized
  return normalized.replace(/^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{4})$/, '$1 $2 $3 $4')
}

export function isPlateLike(value: string): boolean {
  const normalized = normalizePlate(value)
  return /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/.test(normalized)
}

export function plateDiff(read: string, expected: string): {
  readIndices: Set<number>
  expectedIndices: Set<number>
} {
  const a = read.toUpperCase()
  const b = expected.toUpperCase()
  const readIndices = new Set<number>()
  const expectedIndices = new Set<number>()
  const length = Math.max(a.length, b.length)

  for (let index = 0; index < length; index += 1) {
    if (a[index] !== b[index]) {
      if (index < a.length) readIndices.add(index)
      if (index < b.length) expectedIndices.add(index)
    }
  }

  return { readIndices, expectedIndices }
}
