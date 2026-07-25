import type { Question } from '../domain/types';
import { useAppData } from '../state/AppDataContext';

export function useQuestions(): Question[] {
  return useAppData().questions;
}
