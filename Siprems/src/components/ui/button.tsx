import { forwardRef, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'md', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      default: 'bg-blue-500 text-white hover:bg-blue-600 hover:text-cyan-100 focus-visible:ring-blue-500',
      outline: 'border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 dark:hover:text-blue-100',
      secondary: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600',
      ghost: 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-blue-200',
      destructive: 'bg-red-500 text-white hover:bg-red-600 hover:text-red-100 focus-visible:ring-red-500',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

const buttonVariants = (props?: { variant?: string; size?: string }) => {
  const variant = props?.variant || 'default';
  const size = props?.size || 'md';

  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    default: 'bg-blue-500 text-white hover:bg-blue-600 hover:text-cyan-100 focus-visible:ring-blue-500',
    outline: 'border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 dark:hover:text-blue-100',
    secondary: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600',
    ghost: 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-blue-200',
    destructive: 'bg-red-500 text-white hover:bg-red-600 hover:text-red-100 focus-visible:ring-red-500',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm h-9 w-9',
    md: 'px-4 py-2 text-base h-10',
    lg: 'px-6 py-3 text-lg',
    icon: 'h-9 w-9',
    default: 'h-10 px-4 py-2',
  };

  return `${baseStyles} ${variants[variant as keyof typeof variants]} ${sizes[size as keyof typeof sizes]}`;
};

export { Button, buttonVariants };
