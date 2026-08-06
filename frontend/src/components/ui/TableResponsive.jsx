/**
 * TableResponsive Wrapper
 * Prevents main container horizontal overflow and provides horizontal scroll with subtle dark mode styling.
 */
export default function TableResponsive({ children, className = '' }) {
  return (
    <div className={`w-full overflow-x-auto custom-scrollbar border-0 rounded-xl ${className}`}>
      <div className="min-w-full inline-block align-middle">
        {children}
      </div>
    </div>
  );
}
