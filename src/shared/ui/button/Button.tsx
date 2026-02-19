import clsx from "clsx";

const VARIANT_MAP = {
  default: "bg-slate-200 text-slate-700 hover:bg-slate-300",
  primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
  secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
  danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200",
} as const;

const SIZE_MAP = {
  xs: "px-2 py-1 text-xs",
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
  icon: "h-8 w-8 p-0 flex items-center justify-center shrink-0",
} as const;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANT_MAP;
  size?: keyof typeof SIZE_MAP;
}

export function Button({ children, variant = "secondary", size = "md", className, ...props }: ButtonProps) {
  const variantClass = VARIANT_MAP[variant] || VARIANT_MAP.default;
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;
  return (
    <button
      type="button"
      className={clsx(
        "rounded-lg transition-all active:scale-[0.98] font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
        variant !== "ghost" && "hover:opacity-90",
        variantClass,
        sizeClass,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
