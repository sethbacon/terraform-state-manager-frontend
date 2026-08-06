import { isSafeUrl } from '@sethbacon/terraform-suite-ui'

/**
 * App-boundary validator for URLs sourced from the backend / whitelabel config (the
 * suite-switcher sibling URL and the whitelabel theme logo/hero/favicon URLs) before they are
 * handed to shared `@sethbacon/terraform-suite-ui` components.
 *
 * Delegates the base allowlist/normalisation check (control characters, protocol-relative and
 * backslash variants, the relative-path/anchor fast-path, and the URL-constructor parse) to the
 * shared `isSafeUrl`, then narrows its http/https/mailto/tel allowlist down to http(s) only — this
 * app has no mailto:/tel: sinks. Composing this way means a future fix to isSafeUrl (it has
 * already been tuned once, for the embedded-tab/newline WHATWG-normalisation bypass) reaches this
 * app automatically instead of silently drifting.
 */
export function isSafeExternalUrl(value: string | null | undefined): value is string {
  if (!isSafeUrl(value)) return false

  let url: URL
  try {
    // isSafeUrl already accepted this value; only an absolute URL parses here without a base.
    url = new URL(value.trim())
  } catch {
    // Doesn't parse without a base -- isSafeUrl accepted it via the relative-path/anchor
    // fast-path, which carries no scheme to narrow.
    return true
  }

  return url.protocol === 'https:' || url.protocol === 'http:'
}
