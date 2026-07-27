import { apiFetch } from './api';

export type Kit = {
  id: string;
  name: string;
  description: string;
  category: string;
  price_xof: number;
  content_items: string[];
  image_url: string | null;
  is_available: boolean;
};

export async function getKits() {
  const { kits } = await apiFetch<{ kits: Kit[] }>('/kits');
  return kits;
}

export function getKit(kitId: string) {
  return apiFetch<Kit>(`/kits/${kitId}`);
}
