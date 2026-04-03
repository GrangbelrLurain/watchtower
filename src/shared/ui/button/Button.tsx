import clsx from "clsx";

const VARIANT_MAP = {
  default: "",
  primary: "btn-primary",
  secondary: "btn-outline border-base-300 bg-base-100 hover:bg-base-200 text-base-content",
  ghost: "btn-ghost",
  danger: "btn-error text-white",
} as const;

const SIZE_MAP = {
  xs: "btn-xs",
  sm: "btn-sm",
  md: "",
  lg: "btn-lg",
  icon: "btn-square btn-sm",
} as const;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANT_MAP;
  size?: keyof typeof SIZE_MAP;
}

export function Button({ children, variant = "secondary", size = "md", className, ...props }: ButtonProps) {
  const variantClass = VARIANT_MAP[variant] || VARIANT_MAP.default;
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;
  return (
    <button type="button" className={clsx("btn", variantClass, sizeClass, className)} {...props}>
      {children}
    </button>
  );
}
