import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 font-semibold rounded border transition-colors whitespace-nowrap shrink-0 font-sans',
  {
    variants: {
      variant: {
        emergency: 'bg-status-emergency-bg border-status-emergency-border text-status-emergency-text',
        waiting: 'bg-status-waiting-bg border-status-waiting-border text-status-waiting-text',
        flight: 'bg-gray-200/80 border-gray-300 text-gray-700',
        landed: 'bg-status-landed-bg border-status-landed-border text-status-landed-text shadow-2xs',
        caution: 'bg-status-waiting-bg border-status-waiting-border text-status-waiting-text',
        neutral: 'bg-gray-200/80 border-transparent text-gray-800 font-mono',
        slate: 'bg-slate-100 border-slate-200 text-slate-700',
      },
      size: {
        sm: 'text-[11px] px-1.5 py-0.5',
        md: 'text-xs px-2 py-0.5',
        lg: 'text-xs px-2.5 py-1',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'sm',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export { badgeVariants };
