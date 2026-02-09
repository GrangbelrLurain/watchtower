import clsx from "clsx";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={clsx(
        "p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow",
        className,
      )}
    >
      {children}
    </div>
  );
}
