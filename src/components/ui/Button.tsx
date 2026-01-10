import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'glass' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    "relative inline-flex items-center justify-center font-medium transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none font-sans tracking-wide",
                    {
                        // Variants
                        'bg-catalog-accent text-white hover:brightness-95 shadow-md hover:shadow-lg': variant === 'primary',
                        'border-2 border-catalog-accent text-catalog-accent hover:bg-catalog-accent/10': variant === 'secondary',
                        'text-catalog-text hover:text-catalog-accent hover:bg-black/5': variant === 'ghost',
                        'bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md': variant === 'glass',
                        'border border-catalog-accent/20 text-catalog-text hover:bg-catalog-accent/5': variant === 'outline',

                        // Sizes
                        'h-9 px-4 text-sm': size === 'sm',
                        'h-11 px-8 text-base': size === 'md',
                        'h-14 px-10 text-lg': size === 'lg',
                    },
                    className
                )}
                disabled={isLoading || props.disabled}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';
