import React, { useState, useMemo, useEffect, useRef } from "react";
import { Head, router } from "@inertiajs/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ArrowPathIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    MagnifyingGlassIcon,
    ShieldCheckIcon,
    UserGroupIcon,
    UserIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";

import MainLayout from "@/Components/Layout/MainLayout";
import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import Modal from "@/Components/UI/Modal";
import PermissionModuleCard from "@/Components/Roles/PermissionModuleCard";
import UserPermissionsModal from "@/Components/Roles/UserPermissionsModal";
import StatCard from "@/Components/UI/StatCard";
import { MODULE_CONFIG } from "@/Components/Roles/roleConstants";
import api from "@/Services/api";
import { notify } from "@/Services/toast";
import usePermission from "@/Hooks/usePermission";
import useFetchData from "@/Hooks/useFetchData";

const FILTER_MODULE_TABS = [
    { key: "all", label: "All Modules" },
    { key: "students", label: "Students" },
    { key: "instructors", label: "Instructors" },
    { key: "academic", label: "Academic" },
    { key: "attendance", label: "Attendance" },
    { key: "roles", label: "Roles & RBAC" },
    { key: "audit", label: "Audit" },
];

export default function RolesIndex() {
    const queryClient = useQueryClient();
    const { can, hasRole, refreshPermissions } = usePermission();

    // Guard: ensure user has roles.view permission or administrator role
    useEffect(() => {
        if (!hasRole("administrator") && !can("roles.view")) {
            notify.error("Access denied. You do not have permission to view roles.");
            router.visit("/dashboard");
        }
    }, [hasRole, can]);

    const hasInitializedRef = useRef(false);
    const [selectedRoleId, setSelectedRoleId] = useState(null);
    const [rolePermissionMap, setRolePermissionMap] = useState({});
    const [searchQuery, setSearchQuery] = useState("");
    const [activeModuleFilter, setActiveModuleFilter] = useState("all");
    const [isSaving, setIsSaving] = useState(false);
    const [isUserPermModalOpen, setIsUserPermModalOpen] = useState(false);
    const [pendingRoleId, setPendingRoleId] = useState(null);
    const [isConfirmSwitchOpen, setIsConfirmSwitchOpen] = useState(false);

    // 1. Fetch Roles with their assigned permissions
    const {
        data: roles = [],
        isLoading: isLoadingRoles,
        refetch: refetchRoles,
    } = useFetchData(["roles"], "/roles", { refetchOnWindowFocus: false });

    // 2. Fetch all available permissions grouped
    const {
        data: groupedPermissions = {},
        isLoading: isLoadingPermissions,
    } = useFetchData(["permissions"], "/permissions", { refetchOnWindowFocus: false });

    // Initialize local state once roles load on initial mount
    useEffect(() => {
        if (roles.length > 0 && !hasInitializedRef.current) {
            hasInitializedRef.current = true;
            const initialMap = {};
            roles.forEach((r) => {
                initialMap[r.role_id] = (r.permissions || []).map(
                    (p) => p.permission_id
                );
            });
            setRolePermissionMap(initialMap);

            if (selectedRoleId === null) {
                const adminRole = roles.find(
                    (r) => r.is_system_admin || r.role_name.toLowerCase() === "administrator"
                );
                setSelectedRoleId(adminRole ? adminRole.role_id : roles[0].role_id);
            }
        }
    }, [roles, selectedRoleId]);

    // Active selected role object
    const selectedRole = useMemo(() => {
        return roles.find((r) => r.role_id === selectedRoleId) || null;
    }, [roles, selectedRoleId]);

    // Original permissions from server for selected role
    const originalPermissionIds = useMemo(() => {
        if (!selectedRole) return [];
        return (selectedRole.permissions || []).map((p) => p.permission_id);
    }, [selectedRole]);

    // Current working permission IDs for the selected role
    const currentSelectedIds = useMemo(() => {
        if (!selectedRoleId) return [];
        return rolePermissionMap[selectedRoleId] || [];
    }, [rolePermissionMap, selectedRoleId]);

    // Has user made changes for the current role?
    const isDirty = useMemo(() => {
        if (!selectedRoleId) return false;
        const currentSet = new Set(currentSelectedIds);
        const originalSet = new Set(originalPermissionIds);
        if (currentSet.size !== originalSet.size) return true;
        for (const id of currentSet) {
            if (!originalSet.has(id)) return true;
        }
        return false;
    }, [currentSelectedIds, originalPermissionIds, selectedRoleId]);

    // Flatten all permissions list
    const allPermissions = useMemo(() => {
        const list = [];
        Object.values(groupedPermissions).forEach((group) => {
            if (Array.isArray(group)) {
                list.push(...group);
            }
        });
        return list;
    }, [groupedPermissions]);

    // All system permissions categorized by module (unfiltered)
    const allCategorizedModules = useMemo(() => {
        const modules = {
            students: [],
            instructors: [],
            academic: [],
            attendance: [],
            roles: [],
            audit: [],
        };

        allPermissions.forEach((perm) => {
            const moduleName = perm.module_name?.toLowerCase();
            const name = perm.permission_name.toLowerCase();

            if (moduleName && modules[moduleName]) {
                modules[moduleName].push(perm);
            } else if (name.startsWith("students.")) {
                modules.students.push(perm);
            } else if (name.startsWith("instructors.")) {
                modules.instructors.push(perm);
            } else if (name.startsWith("roles.")) {
                modules.roles.push(perm);
            } else if (
                name.startsWith("departments.") ||
                name.startsWith("programs.") ||
                name.startsWith("semesters.") ||
                name.startsWith("courses.") ||
                name.startsWith("facilities.") ||
                name.startsWith("schedules.") ||
                name.startsWith("academic.")
            ) {
                modules.academic.push(perm);
            } else if (name.startsWith("attendance.")) {
                modules.attendance.push(perm);
            } else if (name.startsWith("audit.")) {
                modules.audit.push(perm);
            } else {
                modules.academic.push(perm);
            }
        });

        return modules;
    }, [allPermissions]);

    // Categorized modules filtered by search query
    const categorizedModules = useMemo(() => {
        const searchLower = searchQuery.trim().toLowerCase();
        if (!searchLower) return allCategorizedModules;

        const filtered = {
            students: [],
            instructors: [],
            academic: [],
            attendance: [],
            roles: [],
            audit: [],
        };

        Object.entries(allCategorizedModules).forEach(([modKey, perms]) => {
            filtered[modKey] = perms.filter((perm) => {
                return (
                    perm.permission_name.toLowerCase().includes(searchLower) ||
                    (perm.description &&
                        perm.description.toLowerCase().includes(searchLower))
                );
            });
        });

        return filtered;
    }, [allCategorizedModules, searchQuery]);

    // Visible modules based on active filter tab
    const visibleModuleKeys = useMemo(() => {
        const allKeys = [
            "students",
            "instructors",
            "academic",
            "attendance",
            "roles",
            "audit",
        ];
        if (activeModuleFilter === "all") return allKeys;
        return allKeys.filter((k) => k === activeModuleFilter);
    }, [activeModuleFilter]);

    // Count of matching permissions across all filtered modules
    const totalMatchingPermissions = useMemo(() => {
        return visibleModuleKeys.reduce((acc, key) => {
            return acc + (categorizedModules[key]?.length || 0);
        }, 0);
    }, [visibleModuleKeys, categorizedModules]);

    // Toggle a single permission
    const handleTogglePermission = (permissionId) => {
        if (!selectedRoleId) return;

        setRolePermissionMap((prev) => {
            const currentList = prev[selectedRoleId] || [];
            const exists = currentList.includes(permissionId);
            const updated = exists
                ? currentList.filter((id) => id !== permissionId)
                : [...currentList, permissionId];

            return {
                ...prev,
                [selectedRoleId]: updated,
            };
        });
    };

    // Toggle all permissions in a specific module
    const handleToggleModule = (moduleKey, grantAll, isFiltered = false) => {
        if (!selectedRoleId) return;
        const targetPerms = isFiltered
            ? (categorizedModules[moduleKey] || [])
            : (allCategorizedModules[moduleKey] || []);
        const targetPermIds = targetPerms.map((p) => p.permission_id);

        setRolePermissionMap((prev) => {
            const currentList = prev[selectedRoleId] || [];
            let updated;
            if (grantAll) {
                const set = new Set([...currentList, ...targetPermIds]);
                updated = Array.from(set);
            } else {
                const toRemove = new Set(targetPermIds);
                updated = currentList.filter((id) => !toRemove.has(id));
            }
            return {
                ...prev,
                [selectedRoleId]: updated,
            };
        });
    };

    // Role switching with unsaved changes detection
    const handleSelectRole = (newRoleId) => {
        if (newRoleId === selectedRoleId) return;
        if (isDirty) {
            setPendingRoleId(newRoleId);
            setIsConfirmSwitchOpen(true);
        } else {
            setSelectedRoleId(newRoleId);
        }
    };

    const handleConfirmDiscardAndSwitch = () => {
        if (selectedRoleId) {
            setRolePermissionMap((prev) => ({
                ...prev,
                [selectedRoleId]: originalPermissionIds,
            }));
        }
        setSelectedRoleId(pendingRoleId);
        setPendingRoleId(null);
        setIsConfirmSwitchOpen(false);
        notify.info("Unsaved changes discarded.");
    };

    const handleConfirmSaveAndSwitch = async () => {
        if (!selectedRoleId || isSaving) return;
        setIsSaving(true);
        try {
            await savePermissionsMutation.mutateAsync({
                roleId: selectedRoleId,
                permissionIds: currentSelectedIds,
            });
            setSelectedRoleId(pendingRoleId);
            setPendingRoleId(null);
            setIsConfirmSwitchOpen(false);
        } catch {
            // Handled in onError
        } finally {
            setIsSaving(false);
        }
    };

    // Grant all system permissions to the current role
    const handleGrantAll = () => {
        if (!selectedRoleId) return;
        const allIds = allPermissions.map((p) => p.permission_id);
        setRolePermissionMap((prev) => ({
            ...prev,
            [selectedRoleId]: allIds,
        }));
    };

    // Revoke all permissions from current role
    const handleRevokeAll = () => {
        if (!selectedRoleId) return;
        setRolePermissionMap((prev) => ({
            ...prev,
            [selectedRoleId]: [],
        }));
    };

    // Discard unsaved changes for the selected role
    const handleDiscard = () => {
        if (!selectedRoleId) return;
        setRolePermissionMap((prev) => ({
            ...prev,
            [selectedRoleId]: originalPermissionIds,
        }));
        notify.info("Changes reverted to saved state.");
    };

    // Save permissions mutation
    const savePermissionsMutation = useMutation({
        mutationFn: async ({ roleId, permissionIds }) => {
            const res = await api.put(`/roles/${roleId}/permissions`, {
                permission_ids: permissionIds,
            });
            return res.data;
        },
        onSuccess: async () => {
            notify.success(
                `Permissions for ${selectedRole?.role_name || "role"} updated successfully!`
            );
            await queryClient.invalidateQueries({ queryKey: ["roles"] });
            await refreshPermissions();
            setIsSaving(false);
        },
        onError: (err) => {
            setIsSaving(false);
            const msg =
                err.response?.data?.message ||
                "Failed to update role permissions. Please try again.";
            notify.error(msg);
        },
    });

    const handleSave = () => {
        if (!selectedRoleId || isSaving) return;
        setIsSaving(true);
        savePermissionsMutation.mutate({
            roleId: selectedRoleId,
            permissionIds: currentSelectedIds,
        });
    };

    const isAdministratorRole =
        selectedRole?.role_name?.toLowerCase() === "administrator";

    return (
        <>
            <Head title="Roles & Permissions Management" />

            <div className="space-y-6 pb-16">
                {/* 1. Header: Breadcrumbs & Action Bar matching Students / Instructors */}
                <div className="flex min-h-10 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <Breadcrumbs
                            crumbs={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Roles & Permissions" },
                            ]}
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
                        <button
                            type="button"
                            onClick={() => setIsUserPermModalOpen(true)}
                            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
                            title="Assign or customize permissions for a specific user"
                        >
                            <UserIcon className="h-4 w-4" />
                            <span>Assign User Permissions</span>
                        </button>
                    </div>
                </div>

                {/* 2. Stat Cards matching Students & Instructors pages */}
                <div className="grid gap-4 md:grid-cols-3">
                    <StatCard
                        icon={UserGroupIcon}
                        label="Total System Roles"
                        value={roles.length}
                        tone="gray"
                    />
                    <StatCard
                        icon={ShieldCheckIcon}
                        label="Total Permissions"
                        value={allPermissions.length}
                        tone="blue"
                    />
                    <StatCard
                        icon={CheckCircleIcon}
                        label={`Active for ${selectedRole?.role_name || "Role"}`}
                        value={currentSelectedIds.length}
                        tone="green"
                    />
                </div>

                {/* 3. Main 2-Column Section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Column: Role Selector (4 columns) - Fixed/Sticky */}
                    <div className="lg:col-span-4 space-y-4 lg:sticky lg:-top-6 lg:-mt-6 lg:pt-6 lg:self-start z-10">
                        <div className="rounded-xl bg-white p-5 shadow-sm shadow-blue-950/5 border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    <UserGroupIcon className="h-5 w-5 text-blue-600" />
                                    System Roles
                                </h2>
                                <span className="text-xs bg-gray-100 text-gray-600 border border-gray-200 px-2.5 py-0.5 rounded-full font-semibold">
                                    {roles.length} Roles
                                </span>
                            </div>

                            {isLoadingRoles ? (
                                <div className="space-y-3 py-2">
                                    {[1, 2, 3].map((n) => (
                                        <div
                                            key={n}
                                            className="h-24 bg-gray-100/70 rounded-xl animate-pulse"
                                        />
                                    ))}
                                </div>
                            ) : roles.length === 0 ? (
                                <div className="p-4 text-center text-sm text-gray-500">
                                    No roles found in the database.
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[calc(100vh-12rem)] overflow-y-auto pr-1">
                                    {roles.map((r) => {
                                        const isSelected = r.role_id === selectedRoleId;
                                        const assignedPermCount = (
                                            rolePermissionMap[r.role_id] || []
                                        ).length;
                                        const roleLower = r.role_name.toLowerCase();

                                        return (
                                            <div
                                                key={r.role_id}
                                                onClick={() => handleSelectRole(r.role_id)}
                                                className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer text-left relative overflow-hidden ${isSelected
                                                    ? "bg-blue-50/50 border-blue-500 ring-2 ring-blue-500/20 shadow-sm"
                                                    : "bg-white border-gray-200/80 hover:border-gray-300 hover:bg-gray-50/50"
                                                    }`}
                                            >
                                                {/* Selected indicator bar */}
                                                {isSelected && (
                                                    <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-blue-600" />
                                                )}

                                                <div className="flex items-center justify-between gap-2">
                                                    <span
                                                        className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200"
                                                    >
                                                        {r.role_name}
                                                    </span>
                                                    <span className="text-xs text-gray-500 font-medium">
                                                        {r.user_role_count ?? 0} Users
                                                    </span>
                                                </div>

                                                <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                                                    {r.description ||
                                                        "Custom role with specialized permissions."}
                                                </p>

                                                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100 text-xs">
                                                    <span className="text-gray-400">
                                                        Permissions:
                                                    </span>
                                                    <span className={`font-semibold ${isSelected ? "text-blue-700" : "text-gray-700"}`}>
                                                        {assignedPermCount} / {allPermissions.length} Active
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Permissions Panel (8 columns) */}
                    <div className="lg:col-span-8 flex flex-col space-y-4">
                        {/* STICKY SEARCH & ROLE CONTROL PANEL */}
                        <div className="sticky -top-6 -mt-6 pt-6 pb-2 z-20 bg-gray-100">
                            <div className="rounded-xl bg-white p-5 shadow-sm shadow-blue-950/5 border border-gray-100 space-y-4">
                                {/* Top row: Role title, unsaved badge, grant all, revoke all */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2.5">
                                            <h2 className="text-lg font-bold text-gray-900 capitalize">
                                                {selectedRole?.role_name || "Role"} Permissions
                                            </h2>
                                            {isDirty && (
                                                <span className="text-[11px] bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded-full border border-amber-200">
                                                    Unsaved Changes
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            Toggle modular switches to grant or revoke system capabilities for this role.
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleGrantAll}
                                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition shadow-2xs"
                                        >
                                            Grant All
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleRevokeAll}
                                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 transition shadow-2xs"
                                        >
                                            Revoke All
                                        </button>
                                    </div>
                                </div>

                                {/* Search Input styled identically to Students & Instructors search box */}
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                                        Search Permissions
                                    </label>
                                    <div className="relative">
                                        <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="search"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search permissions by name or keyword..."
                                            className="h-11 w-full rounded-xl bg-gray-50 pl-11 pr-10 text-sm text-gray-700 shadow-sm shadow-blue-950/5 outline-none transition placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                                        />
                                        {searchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => setSearchQuery("")}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                <XMarkIcon className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Module Category Filter Pills */}
                                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
                                    {FILTER_MODULE_TABS.map((tab) => {
                                        const isActive = activeModuleFilter === tab.key;
                                        return (
                                            <button
                                                key={tab.key}
                                                type="button"
                                                onClick={() => setActiveModuleFilter(tab.key)}
                                                className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${isActive
                                                    ? "bg-blue-600 text-white shadow-2xs font-semibold"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200/70 hover:text-gray-900 border border-transparent"
                                                    }`}
                                            >
                                                {tab.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* PERMISSIONS MODULES LIST */}
                        <div className="space-y-4 relative z-0">
                            {isLoadingPermissions ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map((n) => (
                                        <div
                                            key={n}
                                            className="h-44 bg-white rounded-xl border border-gray-100 p-5 animate-pulse shadow-sm shadow-blue-950/5"
                                        />
                                    ))}
                                </div>
                            ) : totalMatchingPermissions === 0 ? (
                                <div className="rounded-xl bg-white p-12 text-center shadow-sm shadow-blue-950/5 border border-gray-100">
                                    <MagnifyingGlassIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                    <h3 className="text-sm font-semibold text-gray-700">
                                        No matching permissions found
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                                        No permissions matched your query "{searchQuery}". Try clearing the search or choosing "All Modules".
                                    </p>
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery("")}
                                            className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 rounded-lg transition"
                                        >
                                            Clear Search
                                        </button>
                                    )}
                                </div>
                            ) : (
                                visibleModuleKeys.map((moduleKey) => {
                                    const perms = categorizedModules[moduleKey] || [];
                                    if (perms.length === 0) return null;

                                    const meta =
                                        MODULE_CONFIG[moduleKey] || {
                                            title: moduleKey,
                                            description: "",
                                            icon: ShieldCheckIcon,
                                            color: "blue",
                                            badge: "bg-blue-50 text-blue-700 border-blue-200",
                                            iconBg: "bg-blue-50 text-blue-600 border-blue-100",
                                        };

                                    const totalModCount = (allCategorizedModules[moduleKey] || []).length;
                                    const isModuleFiltered = Boolean(searchQuery.trim() || activeModuleFilter !== "all");

                                    return (
                                        <PermissionModuleCard
                                            key={moduleKey}
                                            moduleKey={moduleKey}
                                            title={meta.title}
                                            description={meta.description}
                                            icon={meta.icon}
                                            color={meta.color}
                                            badge={meta.badge}
                                            iconBg={meta.iconBg}
                                            permissions={perms}
                                            totalModuleCount={totalModCount}
                                            isFiltered={isModuleFiltered}
                                            selectedPermissionIds={currentSelectedIds}
                                            onTogglePermission={handleTogglePermission}
                                            onToggleAll={handleToggleModule}
                                            disabled={isSaving}
                                        />
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Unsaved Changes Notification Bar */}
            {isDirty && (
                <div className="fixed bottom-6 right-6 z-40 bg-gray-900 text-white px-5 py-3.5 rounded-2xl shadow-xl border border-gray-700 flex items-center gap-4 animate-bounce-short">
                    <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-xs font-medium">
                            Unsaved changes for{" "}
                            <span className="font-bold text-blue-300 capitalize">
                                {selectedRole?.role_name}
                            </span>
                        </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={handleDiscard}
                            className="px-3 py-1.5 text-xs font-semibold text-gray-300 hover:text-white rounded-lg hover:bg-gray-800 transition"
                        >
                            Discard
                        </button>
                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={handleSave}
                            className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition shadow-sm active:scale-95 disabled:opacity-50 inline-flex items-center gap-1.5"
                        >
                            {isSaving ? (
                                <>
                                    <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircleIcon className="h-4 w-4" />
                                    <span>Save Permissions</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Direct User Permissions Modal */}
            <UserPermissionsModal
                isOpen={isUserPermModalOpen}
                onClose={() => setIsUserPermModalOpen(false)}
            />

            {/* Role Switch Unsaved Changes Confirmation Modal */}
            <Modal
                isOpen={isConfirmSwitchOpen}
                onClose={() => {
                    setIsConfirmSwitchOpen(false);
                    setPendingRoleId(null);
                }}
                maxWidth="md"
                title="Unsaved Changes"
                description={`You have unsaved changes for ${selectedRole?.role_name || "this role"}.`}
            >
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600 leading-relaxed">
                        Switching to another role without saving will discard your modifications to{" "}
                        <strong className="text-gray-900 capitalize">
                            {selectedRole?.role_name}
                        </strong>.
                    </p>
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => {
                                setIsConfirmSwitchOpen(false);
                                setPendingRoleId(null);
                            }}
                            className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                        >
                            Stay Here
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmDiscardAndSwitch}
                            className="px-3.5 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition"
                        >
                            Discard & Switch
                        </button>
                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={handleConfirmSaveAndSwitch}
                            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition inline-flex items-center gap-1.5"
                        >
                            {isSaving ? "Saving..." : "Save & Switch"}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

// Attach MainLayout
RolesIndex.layout = (page) => <MainLayout>{page}</MainLayout>;
