import React from 'react';
import { Check, X, Loader2 } from 'lucide-react';

interface ApprovalSwitchProps {
  isApproved: boolean;
  isPending?: boolean;
  onToggle: () => void;
  disabled?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export const ApprovalSwitch: React.FC<ApprovalSwitchProps> = ({
  isApproved,
  isPending = false,
  onToggle,
  disabled = false,
  showLabel = false,
  size = 'md',
}) => {
  const isSm = size === 'sm';
  const trackClass = isSm ? 'h-5 w-10 p-0.5' : 'h-6 w-12 p-0.5';
  const knobClass = isSm ? 'h-4 w-4' : 'h-5 w-5';
  const translateClass = isApproved ? (isSm ? 'translate-x-5' : 'translate-x-6') : 'translate-x-0';
  const iconClass = isSm ? 'w-2.5 h-2.5 stroke-[3]' : 'w-3 h-3 stroke-[3]';

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        type="button"
        role="switch"
        aria-checked={isApproved}
        disabled={disabled || isPending}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        title={
          isApproved
            ? 'Iniciativa aprovada. Clique para recusar.'
            : 'Iniciativa recusada. Clique para aprovar novamente.'
        }
        className={`relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 ${trackClass} ${
          isApproved
            ? 'bg-emerald-600 hover:bg-emerald-500 focus-visible:ring-emerald-500 shadow-sm shadow-emerald-950'
            : 'bg-rose-600 hover:bg-rose-500 focus-visible:ring-rose-500 shadow-sm shadow-rose-950'
        } ${disabled || isPending ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <span
          className={`pointer-events-none inline-flex transform items-center justify-center rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${knobClass} ${translateClass}`}
        >
          {isPending ? (
            <Loader2 className={`${iconClass} text-neutral-600 animate-spin`} />
          ) : isApproved ? (
            <Check className={`${iconClass} text-emerald-600`} />
          ) : (
            <X className={`${iconClass} text-rose-600`} />
          )}
        </span>
      </button>

      {showLabel && (
        <span
          className={`text-[10px] font-bold uppercase tracking-wider select-none ${
            isApproved ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {isApproved ? 'Aprovada' : 'Recusada'}
        </span>
      )}
    </div>
  );
};
