import { motion } from "framer-motion";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium " +
    "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 " +
    "active:scale-[0.98] cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_0_24px_-8px_rgb(var(--c-primary)/0.7)] hover:bg-primary-hover",
        outline: "border border-line bg-surface/50 hover:bg-surface-2 text-content",
        ghost: "hover:bg-surface-2 text-muted hover:text-content",
        subtle: "bg-surface-2 hover:bg-surface-3 text-content border border-line/60",
        destructive: "bg-danger/90 text-white hover:bg-danger",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-xl px-6",
        icon: "h-9 w-9",
        "icon-sm": "h-7 w-7 rounded-md",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

/** Interactive hover micro-lift per ui-master guidelines. */
export function Button({ className, variant, size, loading, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        children
      )}
    </button>
  );
}

export interface IconButtonWrapperProps extends ButtonProps {
  icon: ReactNode;
  label: string;
}

export { buttonVariants };
