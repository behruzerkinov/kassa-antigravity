import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-[3px] border text-[14px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-45',
  {
    variants: {
      variant: {
        default:
          'border-carbon bg-carbon text-white hover:border-carbon-deep hover:bg-carbon-deep active:bg-carbon-deep',
        outline:
          'border-rule-strong bg-paper text-ink hover:border-ink hover:bg-paper-deep',
        subtle: 'border-transparent bg-counter text-ink hover:bg-counter-deep',
        ghost: 'border-transparent bg-transparent text-ink-soft hover:bg-counter hover:text-ink',
        danger: 'border-danger bg-danger text-white hover:border-danger hover:bg-danger/90',
        dangerGhost:
          'border-transparent bg-transparent text-danger hover:bg-danger-tint hover:text-danger',
        success: 'border-success bg-success text-white hover:bg-success/90',
      },
      size: {
        default: 'h-10 px-4',
        sm: 'h-9 px-3 text-[13px]',
        lg: 'h-12 px-6 text-[15px]',
        xl: 'h-14 px-6 text-[16px]',
        icon: 'h-10 w-10 p-0',
        'icon-sm': 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

export { Button, buttonVariants };
