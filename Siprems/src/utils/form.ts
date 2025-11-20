import { FieldValues, UseFormSetError } from 'react-hook-form';
import { ZodError } from 'zod';

export const handleZodErrors = <T extends FieldValues>(
  error: ZodError,
  setError: UseFormSetError<T>
) => {
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (path) {
      setError(path as any, {
        type: 'manual',
        message: err.message,
      });
    }
  });
};

export const getFieldError = (error: any): string => {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  return '';
};
