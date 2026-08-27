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
        "textarea textarea-bordered bg-base-100 min-h-[80px] w-full text-sm resize-y focus:outline-offset-0",
        className,
      )}
      {...props}
    />
  );
});
