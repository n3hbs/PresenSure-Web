import { useCallback, useEffect, useRef, useState } from "react";
import { router, setNavigationBlocker } from "@/Utils/inertia-adapter";

/**
 * Custom hook to intercept navigation away from a dirty form.
 * Catches:
 * 1. RouterLink and Link clicks (Breadcrumbs, Sidebar, Navbar)
 * 2. router.visit calls (Back buttons, programmatic redirects)
 * 3. Browser tab close or page reload (beforeunload)
 * 4. Browser back/forward button (popstate)
 *
 * @param {boolean} isDirty - Whether the form currently contains unsaved changes.
 * @param {string} defaultDiscardUrl - Fallback URL to navigate to when discarding.
 */
export default function useFormDiscardWarning(isDirty, defaultDiscardUrl = null) {
    const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
    const [pendingUrl, setPendingUrl] = useState(null);

    const isDirtyRef = useRef(isDirty);

    useEffect(() => {
        isDirtyRef.current = isDirty;
    }, [isDirty]);

    const allowNavRef = useRef(false);

    // 1. Browser tab close / reload
    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (!isDirtyRef.current) return;
            event.preventDefault();
            event.returnValue = "";
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, []);

    // 2. Intercept router.visit and <Link> clicks
    useEffect(() => {
        const unregister = setNavigationBlocker((targetUrl) => {
            if (allowNavRef.current) {
                allowNavRef.current = false;
                return true;
            }
            if (!isDirtyRef.current) {
                return true;
            }

            setPendingUrl(targetUrl);
            setConfirmDiscardOpen(true);
            return false;
        });

        return unregister;
    }, []);

    // 3. Browser Back / Forward buttons (popstate)
    useEffect(() => {
        const handlePopState = () => {
            if (allowNavRef.current) {
                allowNavRef.current = false;
                return;
            }
            if (!isDirtyRef.current) return;

            // Re-push state so URL doesn't prematurely navigate
            window.history.pushState(null, "", window.location.href);
            setPendingUrl(defaultDiscardUrl || -1);
            setConfirmDiscardOpen(true);
        };

        window.history.pushState(null, "", window.location.href);
        window.addEventListener("popstate", handlePopState);
        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
    }, [defaultDiscardUrl]);

    // Proceed with navigation and discard unsaved form data
    const proceedWithDiscard = useCallback(() => {
        allowNavRef.current = true;
        setConfirmDiscardOpen(false);

        const target = pendingUrl || defaultDiscardUrl;
        setPendingUrl(null);

        if (target === -1) {
            window.history.back();
        } else if (target) {
            router.visit(target, { force: true });
        }
    }, [pendingUrl, defaultDiscardUrl]);

    // Cancel discard and remain on the form
    const cancelDiscard = useCallback(() => {
        setConfirmDiscardOpen(false);
        setPendingUrl(null);
    }, []);

    // Call from explicit "Cancel", "Back", or "Discard" buttons
    const triggerDiscard = useCallback(
        (url) => {
            const target = url || defaultDiscardUrl;
            if (isDirtyRef.current) {
                setPendingUrl(target);
                setConfirmDiscardOpen(true);
            } else if (target) {
                allowNavRef.current = true;
                router.visit(target, { force: true });
            }
        },
        [defaultDiscardUrl]
    );

    // Call before successful form submission so router.visit is not intercepted
    const allowNavigation = useCallback(() => {
        allowNavRef.current = true;
    }, []);

    return {
        confirmDiscardOpen,
        setConfirmDiscardOpen,
        proceedWithDiscard,
        cancelDiscard,
        triggerDiscard,
        allowNavigation,
    };
}
