import axios from "axios";
import { router } from "@inertiajs/react";
import {
    getAuthToken,
    recordUserActivity,
    dispatchAuthExpired,
    clearAuthSession,
} from "@/Services/auth";

const appUrl = import.meta.env.VITE_APP_URL?.replace(/\/$/, "") || "";

const api = axios.create({
    baseURL: `${appUrl}/api`,
    headers: {
        Accept: "application/json",
    },
});

// Automatically attach Bearer token if present
api.interceptors.request.use(
    (config) => {
        try {
            const token = getAuthToken();

            if (token && !config.headers.Authorization) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (e) {
            console.error("Error accessing token from storage:", e);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Intercept responses: record activity on success or trigger session expiration modal on 401
api.interceptors.response.use(
    (response) => {
        recordUserActivity();
        return response;
    },
    (error) => {
        if (
            error.response?.status === 401 &&
            !error.config?.url?.includes("/user/signin")
        ) {
            const token = getAuthToken();
            clearAuthSession();
            if (token) {
                dispatchAuthExpired();
            } else {
                router.visit("/signin");
            }
        }
        return Promise.reject(error);
    }
);

export default api;
