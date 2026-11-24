import { create } from 'zustand';

export type ToastKind = 'info' | 'success' | 'error';

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => number;
  dismiss: (id: number) => void;
  clear: () => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  push: (toast) => {
    const id = nextId++;
    // keep at most 4 messages on screen; a repeated identical message is not stacked
    set((s) => {
      const duplicate = s.toasts.some(
        (t) => t.title === toast.title && t.message === toast.message,
      );
      return duplicate ? s : { toasts: [...s.toasts, { ...toast, id }].slice(-4) };
    });
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

/** Use outside React (API error handler, event handlers). */
export const toast = {
  info: (title: string, message?: string) =>
    useToastStore.getState().push({ kind: 'info', title, message }),
  success: (title: string, message?: string) =>
    useToastStore.getState().push({ kind: 'success', title, message }),
  error: (title: string, message?: string) =>
    useToastStore.getState().push({ kind: 'error', title, message }),
};
