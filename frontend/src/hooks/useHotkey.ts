import { useEffect, useCallback } from 'react'

interface HotkeyOptions {
  enabled?: boolean
  preventDefault?: boolean
}

export function useHotkey(
  combo: string,
  callback: () => void,
  options: HotkeyOptions = {},
): void {
  const { enabled = true, preventDefault = true } = options

  const handler = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      const parts = combo.toLowerCase().split('+')
      const key = parts[parts.length - 1]
      const needsMod = parts.includes('mod')
      const needsShift = parts.includes('shift')
      const needsAlt = parts.includes('alt')

      const modPressed = event.metaKey || event.ctrlKey
      if (needsMod && !modPressed) return
      if (needsShift && !event.shiftKey) return
      if (needsAlt && !event.altKey) return
      if (event.key.toLowerCase() !== key) return

      if (preventDefault) event.preventDefault()
      callback()
    },
    [combo, callback, enabled, preventDefault],
  )

  useEffect(() => {
    if (!enabled) return
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handler, enabled])
}
