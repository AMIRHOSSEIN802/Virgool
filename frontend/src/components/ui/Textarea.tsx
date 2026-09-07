import { TextareaHTMLAttributes, forwardRef } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', label, error, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] resize-none placeholder:text-[var(--muted)] ${
            error
              ? 'border-[var(--error)] focus:ring-[var(--error)]'
              : 'border-[var(--input)] hover:border-[var(--border-strong)]'
          } ${className}`}
          style={{ background: 'var(--surface)', color: 'var(--text-primary)' }}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-[var(--error)]">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
