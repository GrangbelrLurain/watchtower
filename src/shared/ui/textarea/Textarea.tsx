import clsx from "clsx";
import { forwardRef } from "react";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  placeholder?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ placeholder, className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      placeholder={placeholder}
      className={clsx(
        "border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors min-h-[80px] resize-y",
        className,
      )}
      {...props}
    />
  );
});
