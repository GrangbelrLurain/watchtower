import { AlertTriangle, Info, XCircle } from "lucide-react";
import { Button } from "@/shared/ui/button/Button";
import { Modal } from "@/shared/ui/modal/Modal";

export type ConfirmType = "info" | "warning" | "danger";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmType;
}

const TYPE_CONFIG = {
  info: {
    icon: <Info className="w-10 h-10 text-info" />,
    btnVariant: "primary" as const,
    accentClass: "bg-info/10 text-info",
  },
  warning: {
    icon: <AlertTriangle className="w-10 h-10 text-warning" />,
    btnVariant: "primary" as const, // daisy-ui primary is usually fine, or we could add 'warning' to Button
    accentClass: "bg-warning/10 text-warning",
  },
  danger: {
    icon: <XCircle className="w-10 h-10 text-error" />,
    btnVariant: "danger" as const,
    accentClass: "bg-error/10 text-error",
  },
};

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "info",
}: ConfirmModalProps) {
  const config = TYPE_CONFIG[type];

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Body className="pt-10 pb-6 flex flex-col items-center text-center">
        <div className={`p-4 rounded-3xl ${config.accentClass} mb-6`}>{config.icon}</div>
        <h3 className="text-2xl font-black text-base-content tracking-tight mb-2">{title}</h3>
        <p className="text-base-content/60 font-medium max-w-sm">{message}</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} className="px-6 font-bold">
          {cancelText}
        </Button>
        <Button
          variant={config.btnVariant}
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className="px-8 font-black uppercase tracking-widest shadow-lg"
        >
          {confirmText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
