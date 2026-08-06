/**
 * Responsive Select Dropdown Component
 */
export default function Select({
  label,
  error,
  name,
  value,
  onChange,
  className = '',
  required = false,
  disabled = false,
  children,
  helpText,
  ...props
}) {
  return (
    <div className="mb-3.5 w-full">
      {label && (
        <label
          htmlFor={name}
          className="block text-[11px] font-semibold text-teal-muted dark:text-dark-muted uppercase tracking-[0.7px] mb-1.5"
        >
          {label} {required && <span className="text-status-red">*</span>}
        </label>
      )}

      <select
        id={name}
        name={name}
        value={value ?? ''}
        onChange={onChange}
        disabled={disabled}
        className={`w-full px-3 py-2.5 bg-white dark:bg-dark-input text-primary dark:text-dark-text text-[13px] border ${
          error
            ? 'border-status-red focus:ring-status-red/20'
            : 'border-teal-border dark:border-dark-border focus:border-primary dark:focus:border-teal'
        } rounded-lg outline-none transition-colors duration-150 cursor-pointer disabled:opacity-60 min-h-[40px] ${className}`}
        {...props}
      >
        {children}
      </select>

      {helpText && !error && (
        <p className="text-[11px] text-teal-muted dark:text-slate-400 mt-1">{helpText}</p>
      )}

      {error && (
        <p role="alert" className="text-[11px] text-status-red dark:text-red-400 mt-1 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
