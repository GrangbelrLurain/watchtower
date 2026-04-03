import clsx from "clsx";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={clsx(
        "p-4 bg-base-100 text-base-content rounded-xl border border-base-200 shadow-sm hover:shadow-md transition-shadow",
        className,
      )}
    >
      {children}
    </div>
  );
}
