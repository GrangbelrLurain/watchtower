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
}

export function Modal({ children, isOpen, onClose }: ModalProps) {
  // Handle ESC key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
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

  return (
    <ModalContext.Provider value={{ isOpen, onClose }}>
      <AnimatePresence>
        {isOpen && <ModalContent>{children}</ModalContent>}
      </AnimatePresence>
    </ModalContext.Provider>
  );
}

function ModalContent({ children }: { children: React.ReactNode }) {
  const { onClose } = useModalContext();

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
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
    <div className="px-8 pt-8 pb-4 flex items-start justify-between">
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-black text-slate-800 tracking-tight">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-slate-400 font-medium">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {children}
        <button
          type="button"
          onClick={onClose}
          className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

Modal.Body = function ModalBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "px-8 py-4 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200",
        className,
      )}
    >
      {children}
    </div>
  );
};

Modal.Footer = function ModalFooter({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="px-8 py-6 bg-slate-50 flex items-center justify-end gap-3 border-t border-slate-100">
      {children}
    </div>
  );
};
