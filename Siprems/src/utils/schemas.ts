import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU is required'),
  category: z.string().min(1, 'Category is required'),
  variation: z.string().optional().default(''),
  price: z.string().pipe(z.coerce.number().positive('Price must be positive')),
  stock: z.string().pipe(z.coerce.number().int().nonnegative('Stock must be non-negative')),
});

export type ProductFormData = z.infer<typeof productSchema>;

export const transactionSchema = z.object({
  product_sku: z.string().min(1, 'Product selection is required'),
  quantity: z.string().pipe(z.coerce.number().int().positive('Quantity must be positive')),
});

export type TransactionFormData = z.infer<typeof transactionSchema>;
