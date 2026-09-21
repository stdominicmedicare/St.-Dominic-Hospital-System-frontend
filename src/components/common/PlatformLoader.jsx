/**
 * Platform loader – branded overlay for auth and data events.
 * Use with LoaderProvider (event + message) or pass props directly.
 */
import { Building2 } from 'lucide-react';

export const LOADER_EVENTS = {
  signup: {
    title: 'Creating your account',
    message: 'Please wait while we set up your patient profile…',
  },
  login: {
    title: 'Signing you in',
    message: 'Verifying your credentials…',
  },
  session: {
    title: 'Loading St. Dominic Care',
    message: 'Restoring your session…',
  },
  data: {
    title: 'Loading data',
    message: 'Fetching the latest information…',
  },
  save: {
    title: 'Saving',
    message: 'Applying your changes…',
  },
  default: {
    title: 'Please wait',
    message: 'Loading…',
  },
};

export default function PlatformLoader({
  visible = false,
  event = 'default',
  title,
  message,
  fullScreen = true,
}) {
  if (!visible) return null;

  const preset = LOADER_EVENTS[event] || LOADER_EVENTS.default;
  const heading = title || preset.title;
  const detail = message || preset.message;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={
        fullScreen
          ? 'fixed inset-0 z-[200] flex items-center justify-center bg-background-light/80 backdrop-blur-sm'
          : 'absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] bg-surface/80 backdrop-blur-[2px]'
      }
    >
      <div className="mx-4 flex w-full max-w-xs flex-col items-center rounded-card bg-surface px-6 py-8 text-center shadow-card">
        <div className="relative mb-5 flex h-16 w-16 items-center justify-center">
          <span className="platform-loader-ring absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary" />
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-card">
            <Building2 className="h-6 w-6" aria-hidden />
          </span>
        </div>
        <p className="text-sm font-semibold text-text-primary">{heading}</p>
        <p className="mt-1 text-xs text-text-secondary">{detail}</p>
        <p className="mt-4 text-[11px] font-medium tracking-wide text-primary">
          St. Dominic Care
        </p>
      </div>
    </div>
  );
}
