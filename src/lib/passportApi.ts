import { apiFetch } from './api';

export type Passport = {
  points_total: number;
  courses: { completed: number; started: number; list: { course_id: string; title: string }[] };
  missions: { completed: number; list: { mission_id: string; title: string; completed_at: string }[] };
  kits: { orders_count: number; total_spent_xof: number; list: { kit_name: string; quantity: number }[] };
  certificates: {
    id: string;
    course_title: string;
    certificate_number: string;
    score: number;
    issued_at: string;
  }[];
};

export function getPassport(token: string) {
  return apiFetch<Passport>('/passport/me', { token });
}
