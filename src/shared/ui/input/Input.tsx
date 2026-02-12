import clsx from "clsx";
import { forwardRef } from "react";

const INPUT_BASE =
  "border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  placeholder?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ placeholder, className, type = "text", ...props }, ref) => {
    return <input ref={ref} type={type} placeholder={placeholder} className={clsx(INPUT_BASE, className)} {...props} />;
  },
);
