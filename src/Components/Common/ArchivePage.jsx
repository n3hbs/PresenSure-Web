import { useEffect, useMemo, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeftIcon,
    ArrowPathIcon,
    MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import DataTable from "@/Components/UI/DataTable";
import Modal from "@/Components/UI/Modal";
import api from "@/Services/api";
import { notify } from "@/Services/toast";
import usePermission from "@/Hooks/usePermission";
import useFetchData from "@/Hooks/useFetchData";

export default function ArchivePage({
    title,
    _layoutTitle,
    parentTitle,
    parentHref,
    crumbs = null,
    permission,
    queryKey,
    activeQueryKeys = [],
    fetchUrl,
    restoreEndpoint,
    idField,
    entityName = "Item",
    getEntityLabel = (item) => item.name || item[idField],
    filterComponent = null,
    filterFn = (_item, _search) => true,
    columns = () => [],
    transformData = (items) => items,
}) {
    const { can, hasRole } = usePermission();
    const queryClient = useQueryClient();

    // Permission guard
    useEffect(() => {
        if (permission && !hasRole("administrator") && !can(permission)) {
            notify.error(
                "Access Denied",
                `You do not have permission to access archived ${parentTitle.toLowerCase()}.`,
            );
            router.visit(parentHref);
        }
    }, [can, hasRole, permission, parentTitle, parentHref]);

    const [search, setSearch] = useState("");
    const [restoreTarget, setRestoreTarget] = useState(null);

    // Fetch archived records using useFetchData
    const {
        data: rawArchivedItems = [],
        isLoading: loading,
        isError,
    } = useFetchData(queryKey, fetchUrl, {
        staleTime: 0,
    });

    const archivedItems = useMemo(() => {
        const list = Array.isArray(rawArchivedItems) ? rawArchivedItems : [];
        return typeof transformData === "function" ? transformData(list) : list;
    }, [rawArchivedItems, transformData]);

    // Restore mutation
    const restoreMutation = useMutation({
        mutationFn: async (id) => {
            const url =
                typeof restoreEndpoint === "function"
                    ? restoreEndpoint(id)
                    : `${fetchUrl}/${id}/restore`;
            const res = await api.post(url);
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey });
            activeQueryKeys.forEach((key) => {
                queryClient.invalidateQueries({ queryKey: key });
            });
            notify.success(
                `${entityName} Restored`,
                data?.message ||
                    `${entityName} has been successfully restored to active records.`,
            );
            setRestoreTarget(null);
        },
        onError: (err) => {
            const msg =
                err.response?.data?.message ||
                `Failed to restore this ${entityName.toLowerCase()}. Please try again.`;
            notify.error("Restore Failed", msg);
        },
    });

    const filteredItems = useMemo(() => {
        if (!Array.isArray(archivedItems)) return [];
        return archivedItems.filter((item) => {
            const matchesSearch =
                search.trim() === "" || filterFn(item, search.toLowerCase());
            return matchesSearch;
        });
    }, [archivedItems, search, filterFn]);

    const tableColumns = useMemo(() => {
        return columns((item) => setRestoreTarget(item));
    }, [columns]);

    return (
        <>
            <Head title={title} />

            <div className="space-y-6">
                <div className="flex min-h-10 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <Breadcrumbs
                        items={
                            crumbs || [
                                { label: "Dashboard", href: "/dashboard" },
                                { label: parentTitle, href: parentHref },
                                { label: "Archives" },
                            ]
                        }
                    />

                    <Link
                        href={parentHref}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-gray-600 shadow-sm shadow-blue-950/5 transition hover:bg-blue-50 hover:text-blue-700 dark:border dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        Back to {parentTitle}
                    </Link>
                </div>

                {/* Search & Filters */}
                <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm shadow-blue-950/5 sm:flex-row sm:items-center sm:justify-between dark:bg-[#12131C] dark:border dark:border-white/5">
                    <div className="relative flex-1 sm:max-w-md">
                        <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={`Search archived ${parentTitle.toLowerCase()}...`}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-white/10 dark:bg-[#1a1b28] dark:text-white dark:focus:bg-[#1a1b28]"
                        />
                    </div>
                    {filterComponent && (
                        <div className="flex flex-wrap items-center gap-2">
                            {filterComponent}
                        </div>
                    )}
                </div>

                {/* Table */}
                <DataTable
                    columns={tableColumns}
                    data={filteredItems}
                    loading={loading}
                    pagination={true}
                    emptyMessage={
                        isError
                            ? `Failed to load archived ${parentTitle.toLowerCase()}.`
                            : search.trim()
                              ? `No archived ${parentTitle.toLowerCase()} matched your query.`
                              : `No archived ${parentTitle.toLowerCase()} found.`
                    }
                />
            </div>

            {/* Restore Confirmation Modal */}
            <Modal
                isOpen={Boolean(restoreTarget)}
                onClose={() => setRestoreTarget(null)}
                title={`Restore ${entityName}`}
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Are you sure you want to restore{" "}
                        <strong className="text-gray-900 dark:text-white">
                            {restoreTarget ? getEntityLabel(restoreTarget) : ""}
                        </strong>{" "}
                        back to active records?
                    </p>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setRestoreTarget(null)}
                            disabled={restoreMutation.isPending}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                restoreMutation.mutate(restoreTarget[idField])
                            }
                            disabled={restoreMutation.isPending}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
                        >
                            {restoreMutation.isPending && (
                                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                            )}
                            {restoreMutation.isPending
                                ? "Restoring..."
                                : `Restore ${entityName}`}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
