import clsx from "clsx";
import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  placeholder: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ placeholder, className, ...props }, ref) => {
    return (
      <input
        type="text"
        ref={ref}
        placeholder={placeholder}
        className={clsx(
          "px-4 py-2 bg-slate-200 rounded-md hover:bg-slate-300 transition-all active:scale-95",
          className,
        )}
        {...props}
      />
    );
  },
);
