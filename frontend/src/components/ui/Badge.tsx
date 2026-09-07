interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'danger' | 'warning';
  size?: 'sm' | 'md';
}

const variants = {
  default: 'bg-[var(--secondary)] text-[var(--secondary-text)]',
  primary: 'bg-[var(--primary-light)] text-[var(--primary)]',
  success: 'bg-[var(--success-light)] text-[var(--success)]',
  danger: 'bg-[var(--error-light)] text-[var(--error)]',
  warning: 'bg-[var(--warning-light)] text-[var(--warning)]',
};

const sizes = {
  sm: 'px-2.5 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
};

export default function Badge({ children, variant = 'default', size = 'sm' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  );
}
