import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import {
  fetchEmergencyContacts,
  FALLBACK_EMERGENCY_CONTACTS,
  readCachedEmergencyContacts,
} from '@/lib/emergencyContacts';

type EmergencyContactsContextValue = {
  // Toujours une valeur affichable, jamais null/vide — voir plan
  // dashboard admin, §Numéros d'urgence : cache local, puis "185" en
  // ultime repli, jamais un écran d'urgence sans numéro à appeler.
  samuNumber: string;
};

const EmergencyContactsContext = createContext<EmergencyContactsContextValue | undefined>(undefined);

// Valeur initiale = repli en dur pendant l'hydratation du cache/du réseau
// (quelques dizaines de ms) — jamais de valeur vide/indéfinie exposée aux
// écrans, qui rendent immédiatement (pas d'état de chargement à gérer).
export function EmergencyContactsProvider({ children }: PropsWithChildren) {
  const [contacts, setContacts] = useState<Record<string, string>>(FALLBACK_EMERGENCY_CONTACTS);

  useEffect(() => {
    let cancelled = false;

    readCachedEmergencyContacts().then((cached) => {
      if (!cancelled && cached) setContacts(cached);
    });

    // Rafraîchissement réseau en tâche de fond — ne bloque jamais le
    // premier rendu (voir Screen "Consignes sans compte", accessible
    // hors-ligne dès le lancement).
    fetchEmergencyContacts().then((fetched) => {
      if (!cancelled && fetched) setContacts(fetched);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<EmergencyContactsContextValue>(
    () => ({ samuNumber: contacts.samu ?? FALLBACK_EMERGENCY_CONTACTS.samu! }),
    [contacts],
  );

  return <EmergencyContactsContext.Provider value={value}>{children}</EmergencyContactsContext.Provider>;
}

export function useEmergencyContacts() {
  const context = useContext(EmergencyContactsContext);
  if (!context) {
    throw new Error('useEmergencyContacts doit être utilisé à l’intérieur de <EmergencyContactsProvider>');
  }
  return context;
}
