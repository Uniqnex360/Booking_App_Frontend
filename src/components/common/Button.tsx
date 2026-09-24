import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[#7B1E3D] text-white shadow-sm hover:bg-[#5C0F2A] hover:shadow-md',
        outline:
          'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50',
        ghost: 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
        link: 'text-[#7B1E3D] underline-offset-4 hover:underline',
        destructive:
          'bg-destructive text-rose-600-foreground hover:bg-destructive/90',
        secondary:
          'bg-slate-50 text-secondary-foreground hover:bg-slate-50/80',
      },
      size: {
        default: 'h-11 px-5 py-2',
        sm: 'h-9 rounded-full px-4',
        lg: 'h-12 rounded-full px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
