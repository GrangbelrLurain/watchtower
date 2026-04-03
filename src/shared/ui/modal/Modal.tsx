import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect } from "react";
import { createPortal } from "react-dom";

interface ModalContextProps {
  isOpen: boolean;
  onClose: () => void;
}

const ModalContext = createContext<ModalContextProps | undefined>(undefined);

function useModalContext() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("Modal components must be used within a Modal provider");
  }
  return context;
}

interface ModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

const SIZE_CLASSES = {
  sm: "max-w-sm", // 384px
  md: "max-w-md", // 448px
  lg: "max-w-lg", // 512px
  xl: "max-w-xl", // 576px
  "2xl": "max-w-2xl", // 672px
  "4xl": "max-w-4xl", // 896px
  full: "max-w-[95vw]",
};

export function Modal({ children, isOpen, onClose, size = "xl" }: ModalProps) {
  // Handle ESC key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  const sizeClass = SIZE_CLASSES[size as keyof typeof SIZE_CLASSES] || SIZE_CLASSES.xl;

  return (
    <ModalContext.Provider value={{ isOpen, onClose }}>
      <AnimatePresence>{isOpen && <ModalContent sizeClass={sizeClass}>{children}</ModalContent>}</AnimatePresence>
    </ModalContext.Provider>
  );
}

function ModalContent({ children, sizeClass }: { children: React.ReactNode; sizeClass: string }) {
  const { onClose } = useModalContext();

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-neutral/60 backdrop-blur-md"
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 30 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
        className={clsx(
          "relative w-full bg-base-100 text-base-content rounded-[2.5rem] shadow-[0_32px_128px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col border border-base-300/50",
          sizeClass,
        )}
      >
        {children}
      </motion.div>
    </div>,
    document.body,
  );
}

Modal.Header = function ModalHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  const { onClose } = useModalContext();

  return (
    <div className="px-10 pt-10 pb-5 flex items-start justify-between relative overflow-hidden">
      <div className="flex flex-col gap-1.5 relative z-10">
        <h3 className="text-2xl font-black text-base-content tracking-tighter uppercase leading-none">{title}</h3>
        {description && (
          <p className="text-sm text-base-content/50 font-black uppercase tracking-widest opacity-60">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2 relative z-10">
        {children}
        <button
          type="button"
          onClick={onClose}
          className="btn btn-ghost btn-md btn-circle hover:bg-base-200 transition-colors"
        >
          <X className="w-5 h-5 text-base-content/40 hover:text-base-content transition-colors" />
        </button>
      </div>
    </div>
  );
};

Modal.Body = function ModalBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("px-10 py-5 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-base-300", className)}>
      {children}
    </div>
  );
};

Modal.Footer = function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-10 py-8 bg-base-200/50 backdrop-blur-sm flex items-center justify-end gap-4 border-t border-base-300/30">
      {children}
    </div>
  );
};
