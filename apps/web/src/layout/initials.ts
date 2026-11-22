/** "Duty Operator" becomes "DO". Used for the avatar circle. */
export function initials(displayName: string): string {
  const letters = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
  return letters.join('') || '?'
}
