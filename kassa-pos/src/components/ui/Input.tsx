import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  numeric?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, hint, error, id, numeric, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const hintId = `${inputId}-hint`;

    return (
      <div className="flex min-w-0 flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[12px] font-medium text-ink-soft">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          aria-describedby={hint || error ? hintId : undefined}
          aria-invalid={error ? true : undefined}
          className={cn(
            'h-11 w-full min-w-0 rounded-[3px] border border-rule-strong bg-paper px-3 text-[15px] text-ink transition-colors',
            'placeholder:text-ink-faint hover:border-ink-faint focus:border-carbon',
            numeric && 'num text-right',
            error && 'border-danger',
            className,
          )}
          {...props}
        />
        {(hint || error) && (
          <span
            id={hintId}
            className={cn('text-[12px]', error ? 'text-danger' : 'text-ink-faint')}
          >
            {error || hint}
          </span>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';

export { Input };
