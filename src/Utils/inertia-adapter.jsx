import React, { useEffect } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { getStoredUser } from "@/Services/auth";

// Global navigation handler for router.visit outside React components (e.g. in api.js)
let globalNavigate = null;

export const setGlobalNavigate = (nav) => {
    globalNavigate = nav;
};

// Global navigation blocker (e.g. for unsaved form changes)
let currentNavigationBlocker = null;

export const setNavigationBlocker = (blockerFn) => {
    currentNavigationBlocker = blockerFn;
    return () => {
        if (currentNavigationBlocker === blockerFn) {
            currentNavigationBlocker = null;
        }
    };
};

// Event listeners for router.on (e.g. "before")
const eventListeners = {
    before: new Set(),
};

const normalizePath = (url) => {
    if (!url) return "";
    try {
        const parsed = url instanceof URL ? url : new URL(String(url), window.location.origin);
        return `${parsed.pathname}${parsed.search}`;
    } catch {
        return String(url);
    }
};

const checkNavigationAllowed = (targetUrl) => {
    const currentPath = `${window.location.pathname}${window.location.search}`;
    const normalizedTarget = normalizePath(targetUrl);

    // If staying on the exact same page, don't block
    if (normalizedTarget && normalizedTarget === currentPath) {
        return true;
    }

    // 1. Check registered navigation blocker
    if (currentNavigationBlocker) {
        const allowed = currentNavigationBlocker(normalizedTarget || targetUrl);
        if (allowed === false) {
            return false;
        }
    }

    // 2. Check "before" event listeners
    if (eventListeners.before.size > 0) {
        const event = {
            detail: {
                visit: {
                    url: targetUrl,
                },
            },
        };
        for (const listener of eventListeners.before) {
            try {
                const res = listener(event);
                if (res === false) {
                    return false;
                }
            } catch (err) {
                console.error("Error in router before-navigation listener:", err);
            }
        }
    }

    return true;
};

export const router = {
    visit: (url, options = {}) => {
        if (!options.force) {
            if (!checkNavigationAllowed(url)) {
                return;
            }
        }
        if (globalNavigate) {
            globalNavigate(url, { replace: options.replace || false });
        } else {
            window.location.href = url;
        }
    },
    replace: (url, options = {}) => {
        if (!options.force) {
            if (!checkNavigationAllowed(url)) {
                return;
            }
        }
        if (globalNavigate) {
            globalNavigate(url, { replace: true });
        } else {
            window.location.replace(url);
        }
    },
    reload: () => {
        window.location.reload();
    },
    get: (url, options = {}) => {
        if (!options.force) {
            if (!checkNavigationAllowed(url)) {
                return;
            }
        }
        if (globalNavigate) {
            globalNavigate(url);
        } else {
            window.location.href = url;
        }
    },
    post: (url, data, options = {}) => {
        if (!options.force) {
            if (!checkNavigationAllowed(url)) {
                return;
            }
        }
        if (globalNavigate) {
            globalNavigate(url, { replace: options.replace || false });
        } else {
            window.location.href = url;
        }
    },
    put: (url, data, options = {}) => {
        if (!options.force) {
            if (!checkNavigationAllowed(url)) {
                return;
            }
        }
        if (globalNavigate) {
            globalNavigate(url, { replace: options.replace || false });
        } else {
            window.location.href = url;
        }
    },
    patch: (url, data, options = {}) => {
        if (!options.force) {
            if (!checkNavigationAllowed(url)) {
                return;
            }
        }
        if (globalNavigate) {
            globalNavigate(url, { replace: options.replace || false });
        } else {
            window.location.href = url;
        }
    },
    delete: (url, options = {}) => {
        if (!options.force) {
            if (!checkNavigationAllowed(url)) {
                return;
            }
        }
        if (globalNavigate) {
            globalNavigate(url, { replace: options.replace || false });
        } else {
            window.location.href = url;
        }
    },
    on: (event, callback) => {
        if (!eventListeners[event]) {
            eventListeners[event] = new Set();
        }
        eventListeners[event].add(callback);

        return () => {
            eventListeners[event]?.delete(callback);
        };
    },
    cancel: () => {},
};

export const Link = React.forwardRef(function InertiaLink(
    { href, to, onClick, children, ...props },
    ref
) {
    const target = to || href || "#";

    const handleClick = (e) => {
        if (onClick) {
            onClick(e);
        }
        if (e.defaultPrevented) return;

        // Skip external, anchors, mailto
        if (
            !target ||
            target.startsWith("http://") ||
            target.startsWith("https://") ||
            target.startsWith("#") ||
            target.startsWith("mailto:")
        ) {
            return;
        }

        // Check if navigation is blocked
        if (!checkNavigationAllowed(target)) {
            e.preventDefault();
        }
    };

    return (
        <RouterLink ref={ref} to={target} onClick={handleClick} {...props}>
            {children}
        </RouterLink>
    );
});

export const usePage = () => {
    const location = useLocation();
    const user = getStoredUser();

    return {
        url: location.pathname + location.search,
        component: "",
        props: {
            auth: {
                user,
            },
        },
    };
};

export const Head = ({ title }) => {
    useEffect(() => {
        if (title) {
            document.title = `${title} - PresenSure`;
        }
    }, [title]);

    return null;
};

export default {
    router,
    Link,
    usePage,
    Head,
    setGlobalNavigate,
    setNavigationBlocker,
};
