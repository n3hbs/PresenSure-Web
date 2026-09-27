import { useState, useEffect } from "react";
import { Head, Link, router } from "@inertiajs/react";
import {
    IdentificationIcon,
    LockClosedIcon,
    EyeIcon,
    EyeSlashIcon,
    ArrowLeftIcon,
} from "@heroicons/react/24/outline";

import Logo from "@/assets/images/MainLogo.webp";
import Button from "@/Components/UI/Button";
import Toast from "@/Components/UI/Toast";

import api from "@/Services/api";
import { setAuthSession } from "@/Services/auth";

export default function Login() {
    const [showPassword, setShowPassword] = useState(false);
    const [userId, setUserId] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (!toast) return undefined;
        const timer = window.setTimeout(() => setToast(null), 5000);
        return () => window.clearTimeout(timer);
    }, [toast]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        setErrors({});
        setLoading(true);

        try {
            const response = await api.post("/user/signin", {
                user_id: userId.trim(),
                password,
            });

            const { token, user } = response.data.data;

            setAuthSession(token, user);

            router.visit("/dashboard");
        } catch (error) {
            console.error(error);

            if (error.response) {
                switch (error.response.status) {
                    case 422:
                        setErrors(error.response.data.errors || {});
                        setToast({
                            type: "error",
                            title: "Validation Error",
                            message: "Please enter your User ID and password.",
                            id: Date.now(),
                        });
                        break;

                    case 401: {
                        const message =
                            error.response.data.message ||
                            "Invalid credentials.";
                        setErrors({ general: message });
                        setToast({
                            type: "error",
                            title: "Sign In Failed",
                            message,
                            id: Date.now(),
                        });
                        break;
                    }

                    default: {
                        const message =
                            error.response.data.message ?? "Server error.";
                        setErrors({ general: message });
                        setToast({
                            type: "error",
                            title: "Sign In Error",
                            message,
                            id: Date.now(),
                        });
                    }
                }
            } else {
                const message = "Unable to connect to the server.";
                setErrors({ general: message });
                setToast({
                    type: "error",
                    title: "Connection Error",
                    message,
                    id: Date.now(),
                });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Head title="Sign In" />

            {/* Pop Message (Toast) */}
            <Toast toast={toast} onClose={() => setToast(null)} />

            <div className="min-h-screen bg-linear-to-t from-blue-500 to-blue-200 flex items-center justify-center p-4">
                <div className="w-full max-w-sm">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <img
                            src={Logo}
                            alt="PresenSure Logo"
                            className="w-24 h-24 sm:w-28 sm:h-28 object-contain"
                        />

                        <h1 className="mt-4 text-4xl font-bold text-blue-700">
                            PresenSure
                        </h1>

                        <p className="mt-1 text-sm text-blue-900/70">
                            Smart Attendance System
                        </p>
                    </div>

                    {/* Login Card */}
                    <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8">
                        <div className="text-center mb-7">
                            <h2 className="text-2xl font-bold text-gray-800">
                                Sign In
                            </h2>

                            <p className="mt-2 text-sm text-gray-500">
                                Enter your credentials to continue
                            </p>
                        </div>

                        <form
                            onSubmit={handleSubmit}
                            autoComplete="off"
                            className="space-y-5"
                        >

                            {/* User ID */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
                                    User ID
                                </label>

                                <div className="relative group">
                                    <IdentificationIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />

                                    <input
                                        type="text"
                                        value={userId}
                                        onChange={(e) =>
                                            setUserId(e.target.value)
                                        }
                                        placeholder="C-2024-0001"
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/60 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition"
                                    />

                                    {errors.id && (
                                        <p className="mt-1 text-sm text-red-500">
                                            {errors.id[0]}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
                                    Password
                                </label>

                                <div className="relative group">
                                    <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />

                                    <input
                                        type={
                                            showPassword ? "text" : "password"
                                        }
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        placeholder="••••••••"
                                        className="hide-password-reveal w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 bg-gray-50/60 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition"
                                    />

                                    {errors.password && (
                                        <p className="mt-1 text-sm text-red-500">
                                            {errors.password[0]}
                                        </p>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword(!showPassword)
                                        }
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition"
                                    >
                                        {showPassword ? (
                                            <EyeSlashIcon className="h-5 w-5" />
                                        ) : (
                                            <EyeIcon className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Button */}
                            <Button
                                type="submit"
                                className="w-full py-3 rounded-xl"
                                disabled={loading}
                            >
                                {loading ? "Signing In..." : "Sign In"}
                            </Button>
                        </form>
                    </div>

                    {/* Footer */}
                    <p className="mt-8 text-center text-xs uppercase tracking-[0.25em] text-blue-900/60">
                        © {new Date().getFullYear()} PresenSure
                    </p>
                </div>
            </div>
        </>
    );
}
