import clsx from "clsx";

const COLOR_MAP = {
  green: "bg-green-100 text-green-700 border-green-200",
  red: "bg-red-100 text-red-700 border-red-200",
  amber: "bg-amber-100 text-amber-700 border-amber-200",
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  gray: "bg-gray-100 text-gray-700 border-gray-200",
  slate: "bg-slate-100 text-slate-700 border-slate-200",
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
