import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Reusable Responsive Modal Component
 * Ensures modals never exceed viewport bounds, handle dark mode, and provide close on ESC / backdrop tap.
 */
export default function Modal({
  isOpen = true,
  onClose,
  title,
  subtitle,
  icon: Icon,
  children,
  maxWidth = 'max-w-lg', // max-w-sm, max-w-md, max-w-lg, max-w-xl, max-w-2xl, max-w-4xl
  footer,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-primary/40 dark:bg-black/60 backdrop-blur-xs transition-opacity duration-200 animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full ${maxWidth} bg-white dark:bg-dark-card border border-teal-border dark:border-dark-border rounded-t-2xl sm:rounded-2xl shadow-soft-lg flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden transition-all transform duration-200 animate-fade-in`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-primary dark:bg-slate-800 text-white flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-3">
            {Icon && (
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <Icon size={18} className="text-teal-light" />
              </div>
            )}
            <div className="min-w-0">
              {title && <h2 className="text-[15px] font-medium text-white truncate">{title}</h2>}
              {subtitle && <p className="text-[11px] text-teal-light dark:text-slate-400 truncate">{subtitle}</p>}
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer touch-target flex items-center justify-center"
              aria-label="Cerrar modal"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar bg-white dark:bg-dark-card text-primary dark:text-dark-text">
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <div className="flex flex-wrap sm:flex-nowrap justify-end gap-2.5 px-5 py-3.5 border-t border-teal-soft dark:border-dark-border bg-teal-panel/40 dark:bg-slate-800/50 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
