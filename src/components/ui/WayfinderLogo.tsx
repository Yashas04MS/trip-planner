export function WayfinderMark({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 120 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M 28 42 C 40 22 56 22 62 48" stroke="#A7B58A" strokeLinecap="round" strokeWidth="7" />
      <path d="M 62 48 C 70 24 88 20 98 34" stroke="#68764A" strokeLinecap="round" strokeWidth="7" />
      <path
        d="M 30 44 L 46 76 C 49 82 56 82 59 75 L 72 46 C 75 40 82 40 85 46 L 98 34"
        stroke="#343D2B"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="7"
      />
      <circle cx="28" cy="42" fill="#8B7058" r="7.5" />
      <circle cx="98" cy="34" fill="#343D2B" r="8" />
    </svg>
  );
}

export function WayfinderLogo({
  showWordmark = true,
  size = 'md',
}: {
  showWordmark?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const iconCls = size === 'lg' ? 'w-10 h-10' : size === 'sm' ? 'w-7 h-7' : 'w-8 h-8';
  const textCls =
    size === 'lg' ? 'text-xl' : size === 'sm' ? 'text-sm' : 'text-base';

  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      <WayfinderMark className={iconCls} />
      {showWordmark && (
        <span className={`font-display font-semibold tracking-tight text-[#343D2B] ${textCls}`}>
          Wayfinder
        </span>
      )}
    </div>
  );
}
