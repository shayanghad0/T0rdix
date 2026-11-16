import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { useToastStore, type ToastVariant } from "@/stores/toast-store";
import { cn } from "@/lib/utils";

const ICONS: Record<ToastVariant, typeof Info> = {
  success: CheckCircle2,
  error: TriangleAlert,
  info: Info,
};

const TINT: Record<ToastVariant, string> = {
  success: "text-success",
  error: "text-danger",
  info: "text-accent",
};

/** Global toaster mounted once in the app shell. */
export function Toaster() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[24rem] max-w-[calc(100vw-2rem)] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.variant];
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 30, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="pointer-events-auto flex items-start gap-3 rounded-xl border border-line/80 bg-surface/90 p-3.5 shadow-card backdrop-blur-xl"
            >
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", TINT[toast.variant])} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-content">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-0.5 break-words text-xs text-muted">{toast.description}</p>
                ) : null}
              </div>
              <button
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="rounded p-0.5 text-faint hover:text-content"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
