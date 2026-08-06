/**
 * Responsive Input Field Component
 */
export default function Input({
  label,
  error,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  className = '',
  required = false,
  disabled = false,
  icon: Icon,
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

      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3 text-teal-muted dark:text-slate-400 pointer-events-none">
            <Icon size={16} />
          </div>
        )}
        <input
          id={name}
          name={name}
          type={type}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full ${Icon ? 'pl-9' : 'px-3'} py-2.5 bg-white dark:bg-dark-input text-primary dark:text-dark-text text-[13px] border ${
            error
              ? 'border-status-red focus:ring-status-red/20'
              : 'border-teal-border dark:border-dark-border focus:border-primary dark:focus:border-teal'
          } rounded-lg outline-none transition-colors duration-150 placeholder:text-teal-muted/60 dark:placeholder:text-slate-500 disabled:opacity-60 min-h-[40px] ${className}`}
          {...props}
        />
      </div>

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
