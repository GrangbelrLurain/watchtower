import clsx from "clsx";
import { forwardRef } from "react";

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  placeholder?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ placeholder, className, ...props }, ref) => {
    return (
      <textarea
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
