import { activeSemesterStorageKey } from "@/Services/queryKeys";

export const TOKEN_KEY = "token";
export const USER_KEY = "user";
export const LAST_ACTIVITY_KEY = "ps:last_activity";
export const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour (60 minutes)

let lastActivityWriteTime = 0;

/**
 * Retrieve the active auth token.
 * Checks sessionStorage first, falls back to localStorage,
 * and synchronizes back to sessionStorage so other tabs stay in sync.
 */
export const getAuthToken = () => {
    try {
        let token = sessionStorage.getItem(TOKEN_KEY);
        if (!token) {
            token = localStorage.getItem(TOKEN_KEY);
            if (token) {
                sessionStorage.setItem(TOKEN_KEY, token);
                const user = localStorage.getItem(USER_KEY);
                if (user && !sessionStorage.getItem(USER_KEY)) {
                    sessionStorage.setItem(USER_KEY, user);
                }
            }
        }
        return token;
    } catch {
        return null;
    }
};

/**
 * Retrieve stored user details.
 */
export const getStoredUser = () => {
    try {
        let user = sessionStorage.getItem(USER_KEY);
        if (!user) {
            user = localStorage.getItem(USER_KEY);
            if (user) {
                sessionStorage.setItem(USER_KEY, user);
            }
        }
        return user ? JSON.parse(user) : null;
    } catch {
        return null;
    }
};

/**
 * Store user credentials & initialize activity timestamp on sign-in.
 */
export const setAuthSession = (token, user) => {
    try {
        sessionStorage.setItem(TOKEN_KEY, token);
        sessionStorage.setItem(USER_KEY, JSON.stringify(user));
        sessionStorage.removeItem(activeSemesterStorageKey);

        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
        lastActivityWriteTime = Date.now();
    } catch (e) {
        console.error("Error setting auth session:", e);
    }
};

/**
 * Clear user credentials & activity timestamps on logout / session expiration.
 */
export const clearAuthSession = () => {
    try {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
        sessionStorage.removeItem(activeSemesterStorageKey);

        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        localStorage.removeItem(activeSemesterStorageKey);
    } catch (e) {
        console.error("Error clearing auth session:", e);
    }
};

/**
 * Records user activity. Throttled to avoid unnecessary storage operations.
 * @param {boolean} force - If true, ignores throttling.
 */
export const recordUserActivity = (force = false) => {
    const now = Date.now();
    // Throttle to update at most once every 15 seconds unless forced
    if (force || now - lastActivityWriteTime > 15 * 1000) {
        lastActivityWriteTime = now;
        try {
            localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
        } catch {
            // ignore
        }
    }
};

/**
 * Checks if the user's session has been inactive for > 1 hour.
 */
export const isSessionInactive = () => {
    try {
        const token = getAuthToken();
        if (!token) {
            return false;
        }

        const lastActivityStr = localStorage.getItem(LAST_ACTIVITY_KEY);
        if (!lastActivityStr) {
            return false;
        }

        const lastActivity = parseInt(lastActivityStr, 10);
        if (Number.isNaN(lastActivity)) {
            return false;
        }

        return Date.now() - lastActivity > INACTIVITY_TIMEOUT_MS;
    } catch {
        return false;
    }
};

/**
 * Dispatches global session expired event.
 */
export const dispatchAuthExpired = () => {
    window.dispatchEvent(new CustomEvent("ps:auth-expired"));
};
