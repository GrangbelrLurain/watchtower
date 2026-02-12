import clsx from "clsx";

const VARIANT_MAP = {
  default: "bg-slate-200 text-slate-700 hover:bg-slate-300",
  primary: "bg-blue-500 text-white hover:bg-blue-600",
  secondary: "bg-gray-500 text-white hover:bg-gray-600",
  danger: "bg-red-500 text-white hover:bg-red-600",
} as const;

const SIZE_MAP = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
  icon: "h-9 w-9 p-0 flex items-center justify-center shrink-0",
} as const;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANT_MAP;
  size?: keyof typeof SIZE_MAP;
}

export function Button({ children, variant = "default", size = "md", className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={clsx(
        "rounded-lg transition-all active:scale-[0.98] font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
        variant !== "default" && "hover:opacity-90",
        variant === "default" && "hover:opacity-80",
        VARIANT_MAP[variant],
        SIZE_MAP[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
