import { createContext, useContext, useState, ReactNode } from 'react';

interface HelpContextType {
  helpOpen: boolean;
  openHelp: () => void;
  closeHelp: () => void;
}

const HelpContext = createContext<HelpContextType | undefined>(undefined);

const STORAGE_KEY = 'tsm-help-panel-open';

export const HelpProvider = ({ children }: { children: ReactNode }) => {
  const [helpOpen, setHelpOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const openHelp = () => {
    setHelpOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const closeHelp = () => {
    setHelpOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, 'false');
    } catch {
      // ignore
    }
  };

  return (
    <HelpContext.Provider value={{ helpOpen, openHelp, closeHelp }}>
      {children}
    </HelpContext.Provider>
  );
};

export const useHelp = (): HelpContextType => {
  const ctx = useContext(HelpContext);
  if (!ctx) throw new Error('useHelp must be used within a HelpProvider');
  return ctx;
};

export default HelpContext;
