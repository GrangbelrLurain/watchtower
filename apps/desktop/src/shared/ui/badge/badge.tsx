import clsx from "clsx";

const COLOR_MAP = {
  green: "bg-success/10 text-success border-success/20",
  red: "bg-error/10 text-error border-error/20",
  amber: "bg-warning/10 text-warning border-warning/20",
  blue: "bg-info/10 text-info border-info/20",
  gray: "bg-base-200 text-base-content/60 border-base-300",
  slate: "bg-base-200 text-base-content/70 border-base-300",
} as const;

const SIZE_MAP = {
  sm: "px-2 py-0.5 text-[9px]",
  md: "px-2.5 py-0.5 text-[10px]",
} as const;

interface BadgeProps {
  children: React.ReactNode;
  variant?: {
    color?: keyof typeof COLOR_MAP;
    size?: keyof typeof SIZE_MAP;
  };
  className?: string;
}

export function Badge({ children, variant, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "font-bold rounded-full inline-flex items-center justify-center tracking-wide border",
        SIZE_MAP[variant?.size ?? "md"],
        COLOR_MAP[variant?.color ?? "green"],
        className,
      )}
    >
      {children}
    </span>
  );
}
