import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { ApiError } from './api';
import { completeLesson } from './coursesApi';
import { submitQuiz } from './quizApi';

// Actions faites sans réseau (leçon terminée, quiz envoyé), gardées sur
// l'appareil puis envoyées au retour du réseau avec le token du moment —
// pas celui de l'instant de l'action, qui peut avoir expiré (15 min sur web).
// Les deux routes backend supportent un renvoi : une leçon déjà terminée ne
// redonne pas de points, un quiz garde le meilleur score.
const STORAGE_KEY = 'africasecour_offline_queue';

export type QuizAnswer = { quiz_id: string; option_id: string };

export type PendingAction =
  | { kind: 'lesson'; courseId: string; lessonId: string; createdAt: number }
  | { kind: 'quiz'; courseId: string; answers: QuizAnswer[]; createdAt: number };

type Listener = (event: { pending: PendingAction[]; synced: boolean }) => void;
const listeners = new Set<Listener>();
let flushing = false;

async function readQueue(): Promise<PendingAction[]> {
  try {
    const raw = Platform.OS === 'web' ? window.localStorage.getItem(STORAGE_KEY) : await SecureStore.getItemAsync(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as PendingAction[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(items: PendingAction[], synced = false) {
  try {
    if (Platform.OS === 'web') {
      if (items.length > 0) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      else window.localStorage.removeItem(STORAGE_KEY);
    } else if (items.length > 0) {
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(items));
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    }
  } catch {
    // Stockage indisponible (navigation privée) : l'action reste perdue,
    // comme avant ce module — rien de pire.
  }
  listeners.forEach((listener) => listener({ pending: items, synced }));
}

export function isNetworkError(err: unknown) {
  return err instanceof ApiError && err.code === 'NETWORK_ERROR';
}

export async function enqueueOfflineAction(action: PendingAction) {
  const items = await readQueue();
  if (action.kind === 'lesson' && items.some((i) => i.kind === 'lesson' && i.lessonId === action.lessonId)) {
    return;
  }
  await writeQueue([...items, action]);
}

export async function clearOfflineQueue() {
  await writeQueue([]);
}

// Envoie les actions dans l'ordre. S'arrête au premier échec réseau (ou
// session expirée) en gardant le reste ; une erreur définitive du serveur
// (leçon supprimée, données invalides) retire l'action pour ne pas bloquer
// la file indéfiniment.
export async function flushOfflineQueue(token: string) {
  if (flushing) return;
  flushing = true;
  try {
    let sentAny = false;
    for (;;) {
      const first = (await readQueue())[0];
      if (!first) break;
      try {
        if (first.kind === 'lesson') {
          await completeLesson(token, first.lessonId);
        } else {
          await submitQuiz(token, first.courseId, first.answers);
        }
        sentAny = true;
      } catch (err) {
        if (isNetworkError(err) || (err instanceof ApiError && err.status === 401)) break;
      }
      // Relu juste avant d'écrire : une action ajoutée pendant l'envoi
      // ne doit pas être écrasée.
      const current = await readQueue();
      await writeQueue(
        current.filter((a) => !(a.kind === first.kind && a.createdAt === first.createdAt)),
        sentAny,
      );
    }
  } finally {
    flushing = false;
  }
}

// `syncCount` augmente à chaque envoi réussi : un écran qui affiche des
// données serveur s'en sert pour se recharger.
export function useOfflineQueue() {
  const [pending, setPending] = useState<PendingAction[]>([]);
  const [syncCount, setSyncCount] = useState(0);

  useEffect(() => {
    let active = true;
    readQueue().then((items) => {
      if (active) setPending(items);
    });
    const listener: Listener = ({ pending: items, synced }) => {
      setPending(items);
      if (synced) setSyncCount((n) => n + 1);
    };
    listeners.add(listener);
    return () => {
      active = false;
      listeners.delete(listener);
    };
  }, []);

  return { pending, syncCount };
}
