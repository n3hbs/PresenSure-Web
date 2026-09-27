import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    AcademicCapIcon,
    ArrowPathIcon,
    BookOpenIcon,
    CheckCircleIcon,
    ClipboardDocumentListIcon,
    ClockIcon,
    LockClosedIcon,
    MagnifyingGlassIcon,
    ShieldCheckIcon,
    SparklesIcon,
    UserIcon,
    UsersIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";

import Modal from "@/Components/UI/Modal";
import api from "@/Services/api";
import { notify } from "@/Services/toast";
import { getStoredUser } from "@/Services/auth";
import usePermission from "@/Hooks/usePermission";
import { MODULE_CONFIG, getPermissionTitle } from "./roleConstants";

export default function UserPermissionsModal({
    isOpen,
    onClose,
    userId: initialUserId,
    onSaved,
}) {
    const queryClient = useQueryClient();
    const { refreshPermissions } = usePermission();
    const searchInputRef = useRef(null);

    const [selectedUserId, setSelectedUserId] = useState(initialUserId || null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [activeResultIndex, setActiveResultIndex] = useState(-1);
    const [selectedDirectIds, setSelectedDirectIds] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    // Sync initialUserId when prop changes or modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedUserId(initialUserId || null);
            setSearchQuery("");
            setSearchResults([]);
            setActiveResultIndex(-1);
        }
    }, [isOpen, initialUserId]);

    // Auto-focus search input when in search mode
    useEffect(() => {
        if (isOpen && !selectedUserId) {
            const timer = setTimeout(() => {
                searchInputRef.current?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isOpen, selectedUserId]);

    // Fast search with 150ms debounce
    useEffect(() => {
        if (selectedUserId || !searchQuery.trim()) {
            setSearchResults([]);
            setActiveResultIndex(-1);
            setIsSearching(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await api.get(
                    `/users/search?query=${encodeURIComponent(searchQuery.trim())}`
                );
                const results = res.data?.data || [];
                setSearchResults(results);
                setActiveResultIndex(results.length > 0 ? 0 : -1);
            } catch (err) {
                console.error("Failed to search users:", err);
                setSearchResults([]);
                setActiveResultIndex(-1);
            } finally {
                setIsSearching(false);
            }
        }, 150);

        return () => clearTimeout(timer);
    }, [searchQuery, selectedUserId]);

    // 1. Fetch user permissions
    const {
        data: userPermData,
        isLoading: isLoadingUser,
        refetch: refetchUser,
    } = useQuery({
        queryKey: ["user-permissions", selectedUserId],
        queryFn: async () => {
            if (!selectedUserId) return null;
            const res = await api.get(`/users/${selectedUserId}/permissions`);
            return res.data?.data;
        },
        enabled: Boolean(isOpen && selectedUserId),
    });

    // 2. Fetch all system permissions grouped
    const { data: groupedPermissions = {}, isLoading: isLoadingPerms } = useQuery({
        queryKey: ["permissions"],
        queryFn: async () => {
            const res = await api.get("/permissions");
            return res.data?.data || {};
        },
        enabled: Boolean(isOpen),
    });

    // Initialize direct IDs state when user permissions load
    useEffect(() => {
        if (userPermData?.direct_permission_ids) {
            setSelectedDirectIds(userPermData.direct_permission_ids);
        } else {
            setSelectedDirectIds([]);
        }
    }, [userPermData]);

    const inheritedIds = useMemo(() => {
        return new Set(userPermData?.inherited_permission_ids || []);
    }, [userPermData]);

    const originalDirectIds = useMemo(() => {
        return userPermData?.direct_permission_ids || [];
    }, [userPermData]);

    const isDirty = useMemo(() => {
        const cur = new Set(selectedDirectIds);
        const orig = new Set(originalDirectIds);
        if (cur.size !== orig.size) return true;
        for (const id of cur) {
            if (!orig.has(id)) return true;
        }
        return false;
    }, [selectedDirectIds, originalDirectIds]);

    const toggleDirectPermission = (permissionId) => {
        // Cannot toggle if already inherited from role
        if (inheritedIds.has(permissionId)) return;

        setSelectedDirectIds((prev) =>
            prev.includes(permissionId)
                ? prev.filter((id) => id !== permissionId)
                : [...prev, permissionId]
        );
    };

    const handleSelectUser = (user) => {
        setSelectedUserId(user.user_id);
        setSearchQuery("");
        setSearchResults([]);
        setActiveResultIndex(-1);
    };

    // Keyboard navigation in search results
    const handleSearchKeyDown = (e) => {
        if (searchResults.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveResultIndex((prev) =>
                prev < searchResults.length - 1 ? prev + 1 : 0
            );
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveResultIndex((prev) =>
                prev > 0 ? prev - 1 : searchResults.length - 1
            );
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (activeResultIndex >= 0 && searchResults[activeResultIndex]) {
                handleSelectUser(searchResults[activeResultIndex]);
            }
        } else if (e.key === "Escape" && searchQuery) {
            e.preventDefault();
            setSearchQuery("");
            setSearchResults([]);
            setActiveResultIndex(-1);
        }
    };

    const handleClearSearch = () => {
        setSearchQuery("");
        setSearchResults([]);
        setActiveResultIndex(-1);
        searchInputRef.current?.focus();
    };

    const handleSave = async () => {
        if (!selectedUserId || isSaving) return;
        setIsSaving(true);
        try {
            await api.put(`/users/${selectedUserId}/permissions`, {
                permission_ids: selectedDirectIds,
            });
            notify.success(
                `Custom permissions for ${userPermData?.full_name || selectedUserId} updated!`
            );
            await queryClient.invalidateQueries({
                queryKey: ["user-permissions", selectedUserId],
            });
            const storedUser = getStoredUser();
            if (storedUser?.user_id === selectedUserId) {
                await refreshPermissions();
            }
            onSaved?.();
            onClose?.();
        } catch (err) {
            const msg =
                err.response?.data?.message || "Failed to update permissions.";
            notify.error(msg);
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = async () => {
        if (!selectedUserId || isSaving) return;
        if (
            !confirm(
                "Are you sure you want to reset all direct overrides for this user? They will revert to their role defaults."
            )
        ) {
            return;
        }
        setIsSaving(true);
        try {
            await api.delete(`/users/${selectedUserId}/permissions`);
            notify.info("Custom overrides reset to role defaults.");
            await queryClient.invalidateQueries({
                queryKey: ["user-permissions", selectedUserId],
            });
            setSelectedDirectIds([]);
            const storedUser = getStoredUser();
            if (storedUser?.user_id === selectedUserId) {
                await refreshPermissions();
            }
            onSaved?.();
        } catch (err) {
            notify.error("Failed to reset permissions.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="5xl"
            title="User Access Permissions"
            description="Assign or customize individual permission overrides specifically for a user."
        >
            <div className="space-y-5 p-6 max-h-[78vh] overflow-y-auto">
                {/* Search Mode (if no user selected) */}
                {!selectedUserId ? (
                    <div className="space-y-4 max-w-2xl mx-auto py-2">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                Search User by ID or Name
                            </label>
                            <p className="text-xs text-gray-500 mb-3">
                                Find any student, instructor, or administrator to inspect and configure individual access rights.
                            </p>

                            <div className="relative">
                                <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Enter User ID (e.g. 2323-2323, C-2022) or full name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleSearchKeyDown}
                                    className="w-full pl-10 pr-10 py-3 text-sm rounded-xl border border-gray-200 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs transition"
                                />

                                {isSearching ? (
                                    <ArrowPathIcon className="h-4 w-4 text-blue-600 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                                ) : searchQuery ? (
                                    <button
                                        type="button"
                                        onClick={handleClearSearch}
                                        className="h-5 w-5 text-gray-400 hover:text-gray-600 absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
                                    >
                                        <XMarkIcon className="h-3.5 w-3.5" />
                                    </button>
                                ) : null}
                            </div>
                        </div>

                        {/* Search Results Dropdown List */}
                        {searchResults.length > 0 && (
                            <div className="border border-gray-200 rounded-2xl divide-y divide-gray-100 max-h-72 overflow-y-auto bg-white shadow-md">
                                {searchResults.map((u, index) => {
                                    const isHighlighted = index === activeResultIndex;
                                    return (
                                        <div
                                            key={u.user_id}
                                            onClick={() => handleSelectUser(u)}
                                            onMouseEnter={() => setActiveResultIndex(index)}
                                            className={`p-3.5 cursor-pointer flex items-center justify-between gap-3 transition text-left ${
                                                isHighlighted
                                                    ? "bg-blue-50/80 ring-1 ring-blue-400/40"
                                                    : "hover:bg-gray-50"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                {u.profile_picture ? (
                                                    <img
                                                        src={u.profile_picture}
                                                        alt={u.full_name}
                                                        className="h-9 w-9 rounded-full object-cover border border-gray-200 shrink-0"
                                                    />
                                                ) : (
                                                    <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200">
                                                        {u.first_name?.charAt(0) || "U"}
                                                    </div>
                                                )}

                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-xs font-bold text-gray-900 truncate">
                                                            {u.full_name || `${u.first_name} ${u.last_name}`}
                                                        </span>
                                                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                                                            {u.role_name || "User"}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="font-mono text-[11px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                                                            ID: {u.user_id}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSelectUser(u);
                                                }}
                                                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition shadow-2xs shrink-0"
                                            >
                                                Select
                                            </button>
                                        </div>
                                    );
                                })}

                                <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                                    <span>
                                        Navigate with <kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded text-gray-600 font-mono text-[10px]">↑</kbd> <kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded text-gray-600 font-mono text-[10px]">↓</kbd> and press <kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded text-gray-600 font-mono text-[10px]">Enter</kbd> to select
                                    </span>
                                    <span className="font-medium text-gray-500">
                                        {searchResults.length} {searchResults.length === 1 ? "user" : "users"} found
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Empty search state */}
                        {searchQuery.trim() && searchResults.length === 0 && !isSearching && (
                            <div className="text-center py-8 px-4 bg-gray-50/70 rounded-2xl border border-gray-200/80">
                                <MagnifyingGlassIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm font-semibold text-gray-700">
                                    No users found matching "{searchQuery}"
                                </p>
                                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                                    Double-check the ID format (e.g. 2323-2323 or C-2022-0138) or search by last name.
                                </p>
                            </div>
                        )}

                        {/* Initial helper banner */}
                        {!searchQuery.trim() && (
                            <div className="p-4 bg-blue-50/40 rounded-2xl border border-blue-100 text-center">
                                <UserIcon className="h-6 w-6 text-blue-500 mx-auto mb-1.5" />
                                <p className="text-xs font-semibold text-gray-800">
                                    Exact User ID and Name Matching
                                </p>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                    Type an ID with or without hyphens (e.g. 23232323 or 2323-2323) to jump straight to the user.
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Selected User Top Banner */
                    <div>
                        {isLoadingUser ? (
                            <div className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
                        ) : userPermData ? (
                            <div className="bg-blue-50/50 border border-blue-200/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                    {userPermData.profile_picture ? (
                                        <img
                                            src={userPermData.profile_picture}
                                            alt={userPermData.full_name}
                                            className="h-11 w-11 rounded-xl object-cover border border-blue-200 shadow-2xs shrink-0"
                                        />
                                    ) : (
                                        <div className="h-11 w-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-2xs shrink-0">
                                            {userPermData.full_name?.charAt(0) || "U"}
                                        </div>
                                    )}

                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="text-base font-bold text-gray-900">
                                                {userPermData.full_name}
                                            </h4>
                                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                                                {userPermData.role_name}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            User ID:{" "}
                                            <span className="font-mono font-bold text-blue-800 bg-white border border-blue-200 px-2 py-0.5 rounded-md">
                                                {userPermData.user_id}
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0 flex-wrap">
                                    <span className="bg-white px-3 py-1.5 rounded-xl border border-gray-200 text-xs text-gray-600 font-medium shadow-2xs">
                                        Role Inherited: <strong className="text-gray-900 font-bold">{inheritedIds.size}</strong>
                                    </span>
                                    <span className="bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 text-xs text-blue-700 font-medium shadow-2xs">
                                        Direct Overrides: <strong className="text-blue-900 font-bold">{selectedDirectIds.length}</strong>
                                    </span>

                                    {!initialUserId && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedUserId(null);
                                                setSearchQuery("");
                                                setSearchResults([]);
                                            }}
                                            className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white border border-blue-200 hover:bg-blue-50 rounded-xl transition shadow-2xs"
                                        >
                                            Change User
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}

                {/* Permissions by Module in Spacious 2-Column Grid */}
                {selectedUserId && (
                    <>
                        {isLoadingPerms ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {[1, 2, 3, 4].map((n) => (
                                    <div
                                        key={n}
                                        className="h-44 bg-gray-100 rounded-2xl animate-pulse"
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {Object.entries(groupedPermissions).map(
                                    ([moduleKey, perms]) => {
                                        const config =
                                            MODULE_CONFIG[moduleKey] || {
                                                title: moduleKey,
                                                icon: ShieldCheckIcon,
                                                color: "blue",
                                                badge: "bg-blue-50 text-blue-700 border-blue-200",
                                                iconBg: "bg-blue-50 text-blue-600 border-blue-100",
                                            };
                                        const Icon = config.icon;

                                        const grantedInModule = perms.filter(
                                            (p) =>
                                                inheritedIds.has(p.permission_id) ||
                                                selectedDirectIds.includes(
                                                    p.permission_id
                                                )
                                        ).length;

                                        return (
                                            <div
                                                key={moduleKey}
                                                className="border border-gray-200/90 rounded-2xl overflow-hidden bg-white shadow-2xs flex flex-col"
                                            >
                                                {/* Card Header */}
                                                <div className="bg-gray-50/80 px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div
                                                            className={`h-8 w-8 rounded-xl flex items-center justify-center border shrink-0 ${config.iconBg}`}
                                                        >
                                                            <Icon className="h-4 w-4" />
                                                        </div>
                                                        <span className="text-xs font-bold text-gray-900 truncate">
                                                            {config.title}
                                                        </span>
                                                    </div>

                                                    <span
                                                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shrink-0 ${config.badge}`}
                                                    >
                                                        {grantedInModule} / {perms.length} Active
                                                    </span>
                                                </div>

                                                {/* Permission switches list */}
                                                <div className="p-3 divide-y divide-gray-100 flex-1">
                                                    {perms.map((perm) => {
                                                        const isInherited =
                                                            inheritedIds.has(
                                                                perm.permission_id
                                                            );
                                                        const isDirectlyGranted =
                                                            selectedDirectIds.includes(
                                                                perm.permission_id
                                                            );
                                                        const isGranted =
                                                            isInherited ||
                                                            isDirectlyGranted;

                                                        return (
                                                            <div
                                                                key={perm.permission_id}
                                                                onClick={() =>
                                                                    toggleDirectPermission(
                                                                        perm.permission_id
                                                                    )
                                                                }
                                                                className={`py-2.5 px-2 rounded-xl transition-all flex items-start justify-between gap-3 ${
                                                                    isInherited
                                                                        ? "bg-gray-50/70 cursor-not-allowed opacity-90"
                                                                        : isDirectlyGranted
                                                                        ? "bg-blue-50/60 cursor-pointer"
                                                                        : "hover:bg-gray-50/70 cursor-pointer"
                                                                }`}
                                                            >
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                        <span className="text-xs font-bold text-gray-900">
                                                                            {getPermissionTitle(
                                                                                perm.permission_name
                                                                            )}
                                                                        </span>
                                                                        <code className="text-[10px] font-mono text-gray-400 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded">
                                                                            {perm.permission_name}
                                                                        </code>

                                                                        {isInherited && (
                                                                            <span
                                                                                title="Granted automatically via role assignment"
                                                                                className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-gray-200/80 text-gray-600 font-medium"
                                                                            >
                                                                                <LockClosedIcon className="h-2.5 w-2.5" />
                                                                                Role Default
                                                                            </span>
                                                                        )}

                                                                        {isDirectlyGranted && (
                                                                            <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold border border-blue-200">
                                                                                <SparklesIcon className="h-2.5 w-2.5" />
                                                                                Custom Override
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                                                                        {perm.description}
                                                                    </p>
                                                                </div>

                                                                {/* Toggle switch */}
                                                                <div className="pt-0.5 shrink-0">
                                                                    <div
                                                                        className={`h-4.5 w-8 rounded-full transition-colors flex items-center p-0.5 ${
                                                                            isInherited
                                                                                ? "bg-blue-400 justify-end"
                                                                                : isDirectlyGranted
                                                                                ? "bg-blue-600 justify-end"
                                                                                : "bg-gray-200"
                                                                        }`}
                                                                    >
                                                                        <div className="h-3.5 w-3.5 rounded-full bg-white shadow-xs" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    }
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer */}
            {selectedUserId && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        disabled={isSaving || originalDirectIds.length === 0}
                        onClick={handleReset}
                        className="text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-xl border border-transparent hover:border-red-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                        Reset to Role Defaults
                    </button>

                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-2xs"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={isSaving || !isDirty}
                            onClick={handleSave}
                            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5 active:scale-95"
                        >
                            {isSaving ? (
                                <>
                                    <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                                    <span>Saving Changes...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircleIcon className="h-3.5 w-3.5" />
                                    <span>Save Overrides</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
