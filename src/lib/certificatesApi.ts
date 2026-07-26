import { apiFetch } from './api';
import type { Certificate } from './quizApi';

export type { Certificate };

export async function getCertificates(token: string) {
  const { certificates } = await apiFetch<{ certificates: Certificate[] }>('/certificates', { token });
  return certificates;
}

export function getCertificate(token: string, id: string) {
  return apiFetch<Certificate>(`/certificates/${id}`, { token });
}
