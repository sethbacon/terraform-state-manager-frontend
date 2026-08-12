// Terraform address helpers, shared by the state-detail tabs and the state-ops
// dialog: one renders an address for display, the other serializes an instance
// key into the form the backend parses.

// Module paths and instance keys contain no spaces; add zero-width break
// points after dots and before brackets so wrapped lines split between
// segments (module. / nat_shared_use1) instead of mid-word.
export function breakableSegments(s: string): string {
  return s.replace(/\./g, '.\u200b').replace(/\//g, '/\u200b').replace(/\[/g, '\u200b[')
}

// indexToken renders a resource instance key as the bracket suffix the backend
// parses: for_each string keys are JSON-quoted (`["a"]`), count indexes are bare
// (`[0]`). JSON.stringify escapes embedded quotes/backslashes to match the API.
export function indexToken(key: string | number): string {
  return typeof key === 'number' ? `[${key}]` : `[${JSON.stringify(key)}]`
}
