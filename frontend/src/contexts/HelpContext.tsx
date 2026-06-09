import { createContext, useContext, useState, type ReactNode } from 'react'

interface HelpContextType {
  helpOpen: boolean
  openHelp: () => void
  closeHelp: () => void
  toggleHelp: () => void
}

const HelpContext = createContext<HelpContextType | undefined>(undefined)

const STORAGE_KEY = 'tsm-help-panel-open'

export const HelpProvider = ({ children }: { children: ReactNode }) => {
  const [helpOpen, setHelpOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  const persist = (open: boolean) => {
    setHelpOpen(open)
    try {
      localStorage.setItem(STORAGE_KEY, String(open))
    } catch {
      // ignore storage failures
    }
  }

  return (
    <HelpContext.Provider
      value={{
        helpOpen,
        openHelp: () => persist(true),
        closeHelp: () => persist(false),
        toggleHelp: () => persist(!helpOpen),
      }}
    >
      {children}
    </HelpContext.Provider>
  )
}

 
export const useHelp = (): HelpContextType => {
  const ctx = useContext(HelpContext)
  if (!ctx) throw new Error('useHelp must be used within a HelpProvider')
  return ctx
}
