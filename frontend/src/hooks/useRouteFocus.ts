import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

export function useRouteFocus(): void {
  const location = useLocation()
  const isInitialRender = useRef(true)

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false
      return
    }

    const timer = setTimeout(() => {
      const h1 = document.querySelector('h1')
      const main = document.querySelector('main')
      const target = h1 || main

      if (target) {
        if (!target.hasAttribute('tabindex')) {
          target.setAttribute('tabindex', '-1')
        }
        ;(target as HTMLElement).focus({ preventScroll: false })
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [location.pathname])
}
