import clsx from "clsx";

const VARIANT_MAP = {
  default: "bg-slate-200 text-slate-700",
  primary: "bg-blue-500 text-white",
  secondary: "bg-gray-500 text-white",
  danger: "bg-red-500 text-white",
} as const;

const SIZE_MAP = {
  sm: "px-2 py-1 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
} as const;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANT_MAP;
  size?: keyof typeof SIZE_MAP;
}

export function Button({
  children,
  variant = "default",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={clsx(
        "rounded-md hover:opacity-80 transition-all active:scale-95 font-medium cursor-pointer",
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
