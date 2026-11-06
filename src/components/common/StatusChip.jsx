/**
 * Status chips — always show text + color.
 * waiting=orange, in-progress=blue, done=green, urgent=red
 */
const VARIANTS = {
  waiting: {
    label: 'Waiting',
    className: 'bg-[#FFF1E0] text-[#8A4B00]',
  },
  'in-progress': {
    label: 'In progress',
    className: 'bg-[#E3EEFF] text-[#1E4FA8]',
  },
  in_progress: {
    label: 'In progress',
    className: 'bg-[#E3EEFF] text-[#1E4FA8]',
  },
  done: {
    label: 'Done',
    className: 'bg-[#DFF5EC] text-[#11684A]',
  },
  urgent: {
    label: 'Urgent',
    className: 'bg-[#FDE7EA] text-[#A3162E]',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-[#EEF2F1] text-[#3F524F]',
  },
  no_show: {
    label: 'No show',
    className: 'bg-[#EEF2F1] text-[#3F524F]',
  },
};

export default function StatusChip({ status = 'waiting', label, className = '' }) {
  const key = String(status || 'waiting').toLowerCase().replace(/\s+/g, '-');
  const variant = VARIANTS[key] || VARIANTS[status] || {
    label: label || String(status),
    className: 'bg-[#EEF2F1] text-[#3F524F]',
  };
  const text = label || variant.label;

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${variant.className} ${className}`}
      title={text}
    >
      {text}
    </span>
  );
}

export { VARIANTS as STATUS_CHIP_VARIANTS };
