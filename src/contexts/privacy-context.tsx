'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface PrivacyContextValue {
  hidden: boolean;
  toggle: () => void;
}

const PrivacyContext = createContext<PrivacyContextValue>({ hidden: false, toggle: () => {} });

const STORAGE_KEY = 'ofh_privacy_mode';

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === '1') setHidden(true);
  }, []);

  function toggle() {
    setHidden((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  }

  return <PrivacyContext.Provider value={{ hidden, toggle }}>{children}</PrivacyContext.Provider>;
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}

/** Componente para qualquer valor monetário exibido na tela — respeita o modo privacidade. */
export function Money({ value, className }: { value: number; className?: string }) {
  const { hidden } = usePrivacy();
  const formatted = value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return <span className={className}>{hidden ? 'R$ ••••••' : formatted}</span>;
}
