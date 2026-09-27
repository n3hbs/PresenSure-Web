import { isValidElement, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

export default function Modal({
    isOpen,
    open,
    onClose,
    title,
    description,
    icon,
    iconBg = "bg-blue-50 text-blue-600",
    children,
    footer,
    maxWidth = "md",
    preventClose = false,
    showCloseButton,
    zIndex = "z-90",
    className = "",
    backdropClassName = "",
}) {
    const isVisible = isOpen ?? open ?? false;

    const renderIcon = () => {
        if (!icon) return null;
        if (isValidElement(icon)) return icon;
        if (typeof icon === "function" || typeof icon === "object") {
            const IconComp = icon;
            return <IconComp className="h-6 w-6" />;
        }
        return icon;
    };

    useEffect(() => {
        if (!isVisible) return;

        const handleKeyDown = (event) => {
            if (event.key === "Escape" && !preventClose && onClose) {
                onClose();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isVisible, preventClose, onClose]);

    if (!isVisible) return null;

    const maxWidthClasses = {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg",
        xl: "max-w-xl",
        "2xl": "max-w-2xl",
        "3xl": "max-w-3xl",
        "4xl": "max-w-4xl",
        "5xl": "max-w-5xl",
        "6xl": "max-w-6xl",
    };

    const widthClass = maxWidthClasses[maxWidth] || maxWidthClasses.md;
    const shouldShowClose = showCloseButton ?? !preventClose;

    return (
        <div
            className={`fixed inset-0 ${zIndex} flex items-center justify-center bg-gray-950/60 backdrop-blur-sm p-4 ${backdropClassName}`}
            onClick={(e) => {
                if (e.target === e.currentTarget && !preventClose && onClose) {
                    onClose();
                }
            }}
            role="presentation"
        >
            <div
                className={`relative flex flex-col w-full ${widthClass} overflow-hidden rounded-xl bg-white shadow-2xl shadow-blue-950/20 ${className}`}
                role="dialog"
                aria-modal="true"
            >
                {/* Header (Title, Icon, Close Button) */}
                {(title || icon || (shouldShowClose && onClose)) && (
                    <div className="shrink-0 flex items-center justify-between border-b border-gray-200 px-6 py-4">
                        <div className="flex items-center gap-3">
                            {icon && (
                                <div
                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
                                >
                                    {renderIcon()}
                                </div>
                            )}
                            {title && (
                                <h2 className="text-base sm:text-lg font-bold text-gray-900">
                                    {title}
                                </h2>
                            )}
                        </div>

                        {shouldShowClose && onClose && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                                aria-label="Close modal"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                )}

                {/* Body (Description & Children) */}
                {(description || children) && (
                    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 text-sm text-gray-600">
                        {description && (
                            <p className={children ? "mb-3 text-gray-600 leading-relaxed" : "text-gray-600 leading-relaxed"}>
                                {description}
                            </p>
                        )}
                        {children}
                    </div>
                )}

                {/* Footer (Buttons) */}
                {footer && (
                    <div className="shrink-0 flex flex-col-reverse gap-3 border-t border-gray-200 bg-gray-50/50 px-6 py-4 sm:flex-row sm:justify-end">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
