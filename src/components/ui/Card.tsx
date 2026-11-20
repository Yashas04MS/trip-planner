import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  highlight?: boolean;
  children: ReactNode;
}

export function Card({
  elevated = false,
  highlight = false,
  className = '',
  children,
  ...rest
}: CardProps) {
  const surface = elevated ? 'bg-[#F0F0E6]' : 'bg-[#FFFDF7]';
  const border = highlight
    ? 'border-[#8B7058]/45 shadow-[0_6px_24px_rgba(139,112,88,0.09)]'
    : 'border-[#DDE1D2] shadow-[0_1px_8px_rgba(52,61,43,0.04)]';

  return (
    <div
      className={`rounded-2xl border ${surface} ${border} transition-all duration-150 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
