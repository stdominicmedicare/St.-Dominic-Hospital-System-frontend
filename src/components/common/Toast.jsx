/**
 * Design system: Toast. Fixed bottom-center; auto-dismiss; success/error variants.
 */
export default function Toast({ message, type = 'success', visible, show, onDismiss }) {
  const open = visible ?? show;
  if (!open || !message) return null;
  const isError = type === 'error';
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-card px-4 py-3 shadow-dropdown"
      style={{
        backgroundColor: isError ? 'var(--color-error)' : 'var(--color-success)',
        color: 'white',
      }}
    >
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
