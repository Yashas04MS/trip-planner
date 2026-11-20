import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'brown' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-[#68764A] text-white border border-[#566339] hover:bg-[#57643D] shadow-sm active:scale-[0.99]',
  secondary:
    'bg-[#F0F0E6] text-[#343D2B] border border-[#DDE1D2] hover:bg-[#E8EBDD]',
  brown:
    'bg-[#8B7058] text-white border border-[#775E48] hover:bg-[#775E48] shadow-sm active:scale-[0.99]',
  danger:
    'bg-[#FFFDF7] text-[#A94F45] border border-[#A94F45]/35 hover:bg-[#A94F45]/10',
  ghost:
    'bg-transparent text-[#68715A] border border-transparent hover:bg-[#F0F0E6] hover:text-[#343D2B]',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3.5 py-2 text-xs min-h-[36px]',
  md: 'px-5 py-2.5 text-sm min-h-[42px]',
  lg: 'px-6 py-3.5 text-sm min-h-[48px]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap shrink-0 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68764A] disabled:opacity-45 disabled:pointer-events-none cursor-pointer ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
