import { Loader2 } from 'lucide-react';

/**
 * Standard Button component for Oralyn
 * Supports sizes (sm, md, lg), variants (primary, secondary, outline, ghost, danger), and loading state.
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  loading = false,
  disabled = false,
  icon: Icon,
  className = '',
  onClick,
  ...props
}) {
  const baseClasses =
    'inline-flex items-center justify-center font-medium font-sans rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const sizeClasses = {
    sm: 'text-[11px] px-2.5 py-1.5 gap-1.5 min-h-[34px]',
    md: 'text-[12px] px-3.5 py-2 gap-2 min-h-[40px]',
    lg: 'text-[13px] px-5 py-2.5 gap-2.5 min-h-[44px]',
  };

  const variantClasses = {
    primary:
      'bg-primary text-white hover:bg-primary-light dark:bg-teal dark:text-slate-900 dark:hover:bg-teal-light border border-transparent shadow-soft-sm',
    secondary:
      'bg-teal-soft text-primary hover:bg-teal-border/70 dark:bg-slate-800 dark:text-teal-light dark:hover:bg-slate-700 border border-teal-border dark:border-slate-700',
    outline:
      'bg-transparent text-primary hover:bg-teal-info border border-teal-border dark:text-dark-text dark:border-dark-border dark:hover:bg-dark-hover',
    ghost:
      'bg-transparent text-teal-muted hover:text-primary hover:bg-teal-soft dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 border border-transparent',
    danger:
      'bg-status-red text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 border border-transparent shadow-soft-sm',
    softDanger:
      'bg-status-redBg text-status-red hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/50 border border-status-red/20',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseClasses} ${sizeClasses[size] || sizeClasses.md} ${
        variantClasses[variant] || variantClasses.primary
      } ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
      ) : Icon ? (
        <Icon className="w-4 h-4 flex-shrink-0" />
      ) : null}
      <span>{children}</span>
    </button>
  );
}
