import { toast as sonnerToast } from 'sonner';

export const showToast = {
  success: (message: string) => {
    sonnerToast.success(message, {
      position: 'top-right',
      duration: 3000,
    });
  },

  error: (message: string) => {
    sonnerToast.error(message, {
      position: 'top-right',
      duration: 4000,
    });
  },

  loading: (message: string) => {
    return sonnerToast.loading(message, {
      position: 'top-right',
    });
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return sonnerToast.promise(promise, messages, {
      position: 'top-right',
    });
  },

  dismiss: (id: string | number) => {
    sonnerToast.dismiss(id);
  },
};
