import type { ReactNode } from 'react';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'warm' | 'info';

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-[#F0F0E6] text-[#68715A] border-[#DDE1D2]',
  success: 'bg-[#E3E9D8] text-[#547A55] border-[#A7B58A]/60',
  warning: 'bg-[#FFF6E5] text-[#A87832] border-[#E5C378]',
  danger: 'bg-[#FDF0EE] text-[#A94F45] border-[#A94F45]/35',
  warm: 'bg-[#EDE5DA] text-[#8B7058] border-[#8B7058]/30',
  info: 'bg-[#E9EFF1] text-[#657C82] border-[#657C82]/30',
};

export function Badge({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap shrink-0 ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
