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

/**
 * The other half of the same class of bug as the SNI fix above.
 *
 * `${BACKEND_URL}` is a platform-routed ingress on ACA/Cloud Run: the platform
 * picks the target container app from the Host header of the proxied request.
 * `proxy_set_header Host $host` overwrites that with this server's public
 * hostname, which the platform cannot resolve to an app, so it answers 404
 * without the request ever reaching the backend.
 *
 * /health and /ready were unaffected only because they set no proxy headers at
 * all and so inherited nginx's default of the upstream name -- which is why the
 * app could look healthy while every /api/ call 404'd.
 */
describe('nginx.conf.template proxied Host header', () => {
  const masked = maskComments(nginxConf)

  it('never sends this server name as Host to the proxied backend', () => {
    expect(masked).not.toMatch(/proxy_set_header\s+Host\s+\$host\s*;/)
  })

  it('sets Host to the upstream wherever it is set at all', () => {
    const hostHeaders = masked.match(/proxy_set_header\s+Host\s+\S+\s*;/g) ?? []
    expect(hostHeaders.length).toBeGreaterThan(0)
    for (const directive of hostHeaders) {
      expect(directive).toMatch(/\$proxy_host/)
    }
  })

  it('preserves the public hostname in X-Forwarded-Host wherever Host is overridden', () => {
    const hostCount = (masked.match(/proxy_set_header\s+Host\s+\$proxy_host\s*;/g) ?? []).length
    const fwdCount = (masked.match(/proxy_set_header\s+X-Forwarded-Host\s+\$host\s*;/g) ?? []).length
    expect(fwdCount).toBe(hostCount)
  })
})
