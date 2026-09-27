import React, { useEffect } from "react";
import { Link as RouterLink, useNavigate, useLocation } from "react-router-dom";
import { getStoredUser } from "@/Services/auth";

// Global navigation handler for router.visit outside React components (e.g. in api.js)
let globalNavigate = null;

export const setGlobalNavigate = (nav) => {
    globalNavigate = nav;
};

export const router = {
    visit: (url, options = {}) => {
        if (globalNavigate) {
            globalNavigate(url, { replace: options.replace || false });
        } else {
            window.location.href = url;
        }
    },
    replace: (url) => {
        if (globalNavigate) {
            globalNavigate(url, { replace: true });
        } else {
            window.location.replace(url);
        }
    },
    reload: () => {
        window.location.reload();
    },
    get: (url) => {
        if (globalNavigate) {
            globalNavigate(url);
        } else {
            window.location.href = url;
        }
    },
};

export const Link = React.forwardRef(function InertiaLink(
    { href, to, children, ...props },
    ref
) {
    const target = to || href || "#";
    return (
        <RouterLink ref={ref} to={target} {...props}>
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
};
