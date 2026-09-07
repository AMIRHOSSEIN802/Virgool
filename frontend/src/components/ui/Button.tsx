import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

    const variants = {
      primary: 'bg-[var(--primary)] text-[var(--primary-text)] hover:opacity-90 focus-visible:ring-[var(--primary)] shadow-sm',
      secondary: 'bg-[var(--secondary)] text-[var(--secondary-text)] hover:bg-[var(--secondary-hover)] focus-visible:ring-[var(--muted)]',
      ghost: 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] focus-visible:ring-[var(--muted)]',
      danger: 'bg-[var(--error)] text-white hover:opacity-90 focus-visible:ring-[var(--error)]',
      outline: 'border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] focus-visible:ring-[var(--primary)]',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
