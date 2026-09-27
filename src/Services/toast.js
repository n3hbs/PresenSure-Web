/**
 * Global Toast Notification Dispatcher
 * Dispatches a lightweight browser custom event so any active layout/listener
 * can render the standardized toast pop message.
 */
export const notify = {
    show: (type, title, message = "") => {
        if (typeof window !== "undefined") {
            window.dispatchEvent(
                new CustomEvent("ps:toast", {
                    detail: { type, title, message, id: Date.now() },
                })
            );
        }
    },
    success: (title, message = "") => notify.show("success", title, message),
    error: (title, message = "") => notify.show("error", title, message),
    warning: (title, message = "") => notify.show("warning", title, message),
    info: (title, message = "") => notify.show("info", title, message),
};

export default notify;
