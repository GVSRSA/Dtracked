import { toast } from "sonner";

export const showSuccess = (message: string) => {
  toast.success(message);
};

export const showError = (message: string) => {
  toast.error(message);
};

export const showLoading = (message: string) => {
  return toast.loading(message);
};

export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};

export const showConfirmTrackingPrompt = (
  message: string,
  onContinue: () => void,
  onStop: () => void
) => {
  toast(message, {
    duration: 60000, // show for 1 minute
    action: {
      label: "Continue",
      onClick: onContinue,
    },
    cancel: {
      label: "Stop",
      onClick: onStop,
    },
  });
};