import { FileText } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export default function EmptyState({
  title = 'موردی یافت نشد',
  description = 'هنوز هیچ محتوایی وجود ندارد',
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4" style={{ color: 'var(--muted)' }}>
        {icon || <FileText className="h-16 w-16" />}
      </div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      <p className="text-sm max-w-sm" style={{ color: 'var(--text-tertiary)' }}>{description}</p>
    </div>
  );
}
