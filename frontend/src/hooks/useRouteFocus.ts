import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import i18n from '../i18n'
import { useAnnouncer } from '../contexts/AnnouncerContext'

/**
 * Manages focus and screen-reader announcements on SPA route changes. On each
 * navigation it moves focus to the page's first <h1> (or <main>) and announces
 * the new page title via the live-region announcer.
 */
export function useRouteFocus() {
  const location = useLocation()
  const { announce } = useAnnouncer()
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    const timer = setTimeout(() => {
      const heading = document.querySelector<HTMLElement>('h1')
      const main = document.querySelector<HTMLElement>('main')
      const target = heading ?? main

      if (target) {
        if (!target.hasAttribute('tabindex')) {
          target.setAttribute('tabindex', '-1')
          target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true })
        }
        target.focus({ preventScroll: false })
      }

      const title = document.title || heading?.textContent || ''
      if (title) {
        announce(i18n.t('a11y.navigatedTo', { title }))
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [location.pathname, announce])
}
