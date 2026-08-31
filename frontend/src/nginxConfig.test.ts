import { describe, it, expect } from 'vitest'
import nginxConf from '../nginx.conf.template?raw'

/**
 * Regression test for the ACA/Cloud Run 502: `${BACKEND_URL}` is an https://
 * upstream on those platforms, and nginx does not send TLS SNI to a proxied
 * upstream unless `proxy_ssl_server_name on;` is set (default: off). Without
 * it, every `proxy_pass` in this file connects but the platform's
 * SNI-routed ingress cannot place the connection, and nginx reports the
 * failure to the client as a 502.
 *
 * A direct curl from the container to the same upstream URL succeeds (curl
 * always sends SNI), which is what made this bug look like a networking
 * problem rather than a one-line nginx config gap.
 *
 * The registry frontend carries the same fix, with the same reasoning, in
 * nginx-ecs.conf.template.
 *
 * This is a STATIC check of the template, not a runtime one: it cannot prove
 * nginx actually negotiates SNI (that needs a container), it enforces the
 * config line that causes the bug when absent.
 */

/**
 * Blank out `#` comments with spaces of the same length, so byte offsets used
 * below stay valid and a commented-out directive can never satisfy the check.
 */
function maskComments(conf: string): string {
  let out = ''
  let quote: string | null = null
  for (let i = 0; i < conf.length; i++) {
    const c = conf[i]
    if (quote) {
      out += c
      if (c === quote) quote = null
    } else if (c === '"' || c === "'") {
      quote = c
      out += c
    } else if (c === '#') {
      let j = i
      while (j < conf.length && conf[j] !== '\n') j++
      out += ' '.repeat(j - i)
      i = j - 1
    } else {
      out += c
    }
  }
  return out
}

describe('nginx.conf.template', () => {
  const masked = maskComments(nginxConf)

  it('sends SNI to the proxied backend', () => {
    expect(masked).toMatch(/proxy_ssl_server_name\s+on;/)
  })

  it('declares it before the first location block (server level, not one path only)', () => {
    const directiveIndex = masked.search(/proxy_ssl_server_name\s+on;/)
    const firstLocationIndex = masked.indexOf('location')

    expect(directiveIndex).toBeGreaterThanOrEqual(0)
    expect(firstLocationIndex).toBeGreaterThan(0)
    expect(directiveIndex).toBeLessThan(firstLocationIndex)
  })

  it('does not count a commented-out directive as declared', () => {
    const conf = ['server {', '    # proxy_ssl_server_name on;', '    location / {}', '}'].join(
      '\n',
    )

    expect(maskComments(conf)).not.toMatch(/proxy_ssl_server_name\s+on;/)
  })
})
