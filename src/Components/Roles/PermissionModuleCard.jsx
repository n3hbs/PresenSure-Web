import React from "react";
import { CheckIcon } from "@heroicons/react/24/solid";
import { getPermissionTitle } from "./roleConstants";

export default function PermissionModuleCard({
    moduleKey,
    title,
    description,
    icon: Icon,
    color = "blue",
    badge = "bg-blue-50 text-blue-700 border-blue-200",
    iconBg = "bg-blue-50 text-blue-600 border-blue-100",
    permissions = [],
    totalModuleCount,
    isFiltered = false,
    selectedPermissionIds = [],
    onTogglePermission,
    onToggleAll,
    disabled = false,
}) {
    const totalCount = totalModuleCount ?? permissions.length;
    const matchingCount = permissions.length;
    const selectedCount = permissions.filter((p) =>
        selectedPermissionIds.includes(p.permission_id)
    ).length;
    const isAllSelected = matchingCount > 0 && selectedCount === matchingCount;

    const badgeStyle =
        selectedCount === matchingCount && matchingCount > 0
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : selectedCount > 0
            ? "bg-blue-50 text-blue-700 border-blue-200"
            : "bg-gray-100 text-gray-500 border-gray-200";

    return (
        <div className="rounded-xl bg-white shadow-sm shadow-blue-950/5 border border-gray-100 overflow-hidden transition-all duration-200">
            {/* Header */}
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div
                            className={`h-10 w-10 rounded-xl flex items-center justify-center border shrink-0 ${iconBg}`}
                        >
                            <Icon className="h-5 w-5" />
                        </div>
                    )}
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-bold text-gray-900">
                                {title}
                            </h3>
                            <span
                                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${badgeStyle}`}
                            >
                                {isFiltered
                                    ? `${selectedCount} / ${matchingCount} Matching (${totalCount} Total)`
                                    : `${selectedCount} / ${totalCount} Granted`}
                            </span>
                        </div>
                        {description && (
                            <p className="text-xs text-gray-400 mt-0.5">
                                {description}
                            </p>
                        )}
                    </div>
                </div>

                {/* Quick Toggle All Button */}
                <button
                    type="button"
                    disabled={disabled || matchingCount === 0}
                    onClick={() => onToggleAll(moduleKey, !isAllSelected, isFiltered)}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all duration-150 ${
                        isAllSelected
                            ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100/70"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                    } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-95 shadow-2xs"}`}
                >
                    <CheckIcon
                        className={`h-3.5 w-3.5 ${
                            isAllSelected ? "text-blue-600" : "text-gray-400"
                        }`}
                    />
                    {isFiltered
                        ? isAllSelected
                            ? "Deselect Filtered"
                            : "Grant Filtered"
                        : isAllSelected
                        ? "Deselect All"
                        : "Grant All"}
                </button>
            </div>

            {/* Permissions List - Clean Rows matching DataTable Aesthetic */}
            <div className="divide-y divide-gray-100">
                {permissions.map((perm) => {
                    const isChecked = selectedPermissionIds.includes(
                        perm.permission_id
                    );

                    return (
                        <div
                            key={perm.permission_id}
                            onClick={() => {
                                if (!disabled) {
                                    onTogglePermission(perm.permission_id);
                                }
                            }}
                            className={`px-5 py-3.5 flex items-center justify-between gap-4 transition-colors select-none ${
                                disabled
                                    ? "cursor-not-allowed opacity-60"
                                    : "cursor-pointer hover:bg-gray-50/70"
                            } ${isChecked ? "bg-blue-50/25" : "bg-white"}`}
                        >
                            {/* Left: Action Title, Description & Code */}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-semibold text-gray-900 leading-tight">
                                        {getPermissionTitle(perm.permission_name)}
                                    </span>
                                    <code className="text-[10px] font-mono text-gray-500 bg-gray-100 border border-gray-200/80 px-1.5 py-0.5 rounded break-all">
                                        {perm.permission_name}
                                    </code>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5 leading-normal break-words">
                                    {perm.description || "No description provided."}
                                </p>
                            </div>

                            {/* Right: Status Badge & Toggle Switch */}
                            <div className="flex items-center gap-3 shrink-0">
                                <span
                                    className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${
                                        isChecked
                                            ? "bg-blue-50 text-blue-700 border-blue-200"
                                            : "bg-gray-100 text-gray-500 border-gray-200"
                                    }`}
                                >
                                    {isChecked ? "Granted" : "Revoked"}
                                </span>

                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={isChecked}
                                    disabled={disabled}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!disabled) {
                                            onTogglePermission(perm.permission_id);
                                        }
                                    }}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                        isChecked ? "bg-blue-600" : "bg-gray-200"
                                    } ${disabled ? "cursor-not-allowed" : ""}`}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                            isChecked ? "translate-x-4" : "translate-x-0"
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
