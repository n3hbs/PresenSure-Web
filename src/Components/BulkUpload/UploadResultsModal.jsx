import { useState, useMemo } from "react";
import {
    CheckCircleIcon,
    ExclamationCircleIcon,
    ExclamationTriangleIcon,
    MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import Modal from "@/Components/UI/Modal";
import Button from "@/Components/UI/Button";

export default function UploadResultsModal({
    isOpen,
    onClose,
    results,
    type = "student",
}) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const label = type === "student" ? "Student" : "Instructor";

    const allItems = useMemo(() => {
        if (!results) return [];

        const items = [];

        // Helper to infer or get role
        const getRole = (item) => {
            if (item.role && item.role !== "Unknown") return item.role;
            const id = item.user_id || "";
            return id.toUpperCase().startsWith("C-") ? "Instructor" : "Student";
        };

        // Success items
        if (Array.isArray(results.success)) {
            results.success.forEach((item) => {
                items.push({
                    userId: item.user_id,
                    fullName: item.fullname,
                    role: getRole(item),
                    imageUrl: item.image_url,
                    status: "Uploaded",
                    category: "success",
                    detail: "Successfully uploaded to Cloudinary",
                });
            });
        }

        // Failed categories
        const failedMap = results.failed || {};

        if (Array.isArray(failedMap.profile_exists)) {
            failedMap.profile_exists.forEach((item) => {
                items.push({
                    userId: item.user_id,
                    fullName: item.fullname,
                    role: getRole(item),
                    status: "Profile Exists",
                    category: "skipped",
                    detail: "Skipped (profile photo already exists)",
                });
            });
        }

        if (Array.isArray(failedMap.user_not_found)) {
            failedMap.user_not_found.forEach((item) => {
                items.push({
                    userId: item.user_id,
                    fullName: item.fullname,
                    role: getRole(item),
                    status: "User Not Found",
                    category: "failed",
                    detail: item.status || "User ID not registered in database",
                });
            });
        }

        if (Array.isArray(failedMap.invalid_name_format)) {
            failedMap.invalid_name_format.forEach((item) => {
                items.push({
                    userId: item.user_id,
                    fullName: item.fullname,
                    role: getRole(item),
                    status: "Invalid ID Format",
                    category: "failed",
                    detail: item.detail || "Filename must be formatted like C-0000-0000 or 0000-0000",
                });
            });
        }

        if (Array.isArray(failedMap.invalid_format)) {
            failedMap.invalid_format.forEach((item) => {
                items.push({
                    userId: item.user_id,
                    fullName: item.fullname,
                    role: getRole(item),
                    status: "Invalid Extension",
                    category: "failed",
                    detail: "File extension must be JPG, PNG, or WEBP",
                });
            });
        }

        if (Array.isArray(failedMap.upload_failed)) {
            failedMap.upload_failed.forEach((item) => {
                items.push({
                    userId: item.user_id,
                    fullName: item.fullname,
                    role: getRole(item),
                    status: "Upload Failed",
                    category: "failed",
                    detail: item.error || "Failed uploading image to cloud storage",
                });
            });
        }

        return items;
    }, [results]);

    const filteredItems = useMemo(() => {
        const query = search.trim().toLowerCase();

        return allItems.filter((item) => {
            const matchesSearch = query
                ? item.userId?.toLowerCase().includes(query) ||
                  item.fullName?.toLowerCase().includes(query) ||
                  item.role?.toLowerCase().includes(query)
                : true;

            const matchesStatus =
                statusFilter === "all" ? true : item.category === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [allItems, search, statusFilter]);

    const summary = useMemo(() => {
        const total = allItems.length;
        const uploaded = allItems.filter((i) => i.category === "success").length;
        const skipped = allItems.filter((i) => i.category === "skipped").length;
        const failed = allItems.filter((i) => i.category === "failed").length;
        return { total, uploaded, skipped, failed };
    }, [allItems]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="2xl"
            className="h-[600px] max-h-[85vh]"
            title="Image Upload Results"
            icon={
                summary.failed === 0 && summary.skipped === 0 ? (
                    <CheckCircleIcon className="h-6 w-6 text-green-600" />
                ) : (
                    <ExclamationCircleIcon className="h-6 w-6 text-blue-600" />
                )
            }
            iconBg={
                summary.failed === 0 && summary.skipped === 0
                    ? "bg-green-50 text-green-600"
                    : "bg-blue-50 text-blue-600"
            }
            footer={
                <Button type="button" onClick={onClose}>
                    Done
                </Button>
            }
        >
            <div className="flex flex-col h-full space-y-4">
                {/* Summary badges */}
                <div className="shrink-0 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-lg bg-gray-50 p-2.5 text-center border border-gray-100">
                        <span className="block text-xs font-medium text-gray-500">Total</span>
                        <span className="text-lg font-bold text-gray-800">{summary.total}</span>
                    </div>
                    <div className="rounded-lg bg-green-50 p-2.5 text-center border border-green-100">
                        <span className="block text-xs font-medium text-green-600">Uploaded</span>
                        <span className="text-lg font-bold text-green-700">{summary.uploaded}</span>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-2.5 text-center border border-amber-100">
                        <span className="block text-xs font-medium text-amber-600">Skipped</span>
                        <span className="text-lg font-bold text-amber-700">{summary.skipped}</span>
                    </div>
                    <div className="rounded-lg bg-red-50 p-2.5 text-center border border-red-100">
                        <span className="block text-xs font-medium text-red-600">Failed</span>
                        <span className="text-lg font-bold text-red-700">{summary.failed}</span>
                    </div>
                </div>

                {/* Filters */}
                <div className="shrink-0 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Filter by ID, Name, or Role..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-9 w-full rounded-lg border border-gray-200 pl-9 pr-3 text-xs text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex gap-1 overflow-x-auto">
                        {[
                            { key: "all", label: "All" },
                            { key: "success", label: "Uploaded" },
                            { key: "skipped", label: "Skipped" },
                            { key: "failed", label: "Failed" },
                        ].map((filter) => (
                            <button
                                key={filter.key}
                                type="button"
                                onClick={() => setStatusFilter(filter.key)}
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                                    statusFilter === filter.key
                                        ? "bg-blue-600 text-white shadow-sm"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Results Table (stretches to fill fixed modal height) */}
                <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-gray-200">
                    <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 text-gray-600 shadow-xs">
                            <tr>
                                <th className="px-3 py-2 font-semibold">User ID</th>
                                <th className="px-3 py-2 font-semibold">Full Name</th>
                                <th className="px-3 py-2 font-semibold">Role</th>
                                <th className="px-3 py-2 font-semibold">Status</th>
                                <th className="px-3 py-2 font-semibold">Detail</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {filteredItems.map((item, index) => (
                                <tr key={index} className="hover:bg-gray-50/50">
                                    <td className="px-3 py-2 font-mono font-medium text-gray-900 whitespace-nowrap">
                                        {item.userId}
                                    </td>
                                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                                        {item.fullName || (
                                            <span className="text-gray-400 italic">N/A</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap">
                                        <span
                                            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                                                item.role === "Instructor"
                                                    ? "bg-purple-50 text-purple-700 border border-purple-200"
                                                    : "bg-blue-50 text-blue-700 border border-blue-200"
                                            }`}
                                        >
                                            {item.role}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap">
                                        <span
                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                                item.category === "success"
                                                    ? "bg-green-50 text-green-700 border border-green-200"
                                                    : item.category === "skipped"
                                                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                      : "bg-red-50 text-red-700 border border-red-200"
                                            }`}
                                        >
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-gray-500 max-w-xs truncate" title={item.detail}>
                                        {item.detail}
                                    </td>
                                </tr>
                            ))}

                            {filteredItems.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-400">
                                        No items match the current filter.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </Modal>
    );
}
