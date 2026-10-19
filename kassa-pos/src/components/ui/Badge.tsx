import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 whitespace-nowrap rounded-[2px] border px-1.5 py-0.5 text-[11px] font-medium leading-4',
  {
    variants: {
      variant: {
        default: 'border-carbon/30 bg-carbon-tint text-carbon',
        neutral: 'border-rule-strong bg-paper text-ink-soft',
        success: 'border-success/30 bg-success-tint text-success',
        danger: 'border-danger/30 bg-danger-tint text-danger',
        warning: 'border-warning/30 bg-warning-tint text-warning',
        solid: 'border-ink bg-ink text-paper',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
