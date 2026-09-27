import { useEffect, useMemo, useState } from "react";
import { Head, router } from "@inertiajs/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ArchiveBoxIcon,
    ArrowLeftIcon,
    ArrowPathIcon,
    MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

import MainLayout from "@/Components/Layout/MainLayout";
import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import DataTable from "@/Components/UI/DataTable";
import Modal from "@/Components/UI/Modal";
import StatCard from "@/Components/UI/StatCard";
import api from "@/Services/api";
import { notify } from "@/Services/toast";
import usePermission from "@/Hooks/usePermission";
import useFetchData from "@/Hooks/useFetchData";

export default function ArchivePage({
    title,
    parentTitle,
    parentHref,
    permission,
    queryKey,
    activeQueryKeys = [],
    fetchUrl,
    restoreEndpoint,
    idField,
    entityName = "Item",
    getEntityLabel = (item) => item.name || item[idField],
    statCards = [],
    filterComponent = null,
    filterFn = (item, search) => true,
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
                `You do not have permission to access archived ${parentTitle.toLowerCase()}.`
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
        refetchOnMount: "always",
    });

    const archivedItems = useMemo(() => {
        const list = Array.isArray(rawArchivedItems) ? rawArchivedItems : [];
        return typeof transformData === "function" ? transformData(list) : list;
    }, [rawArchivedItems, transformData]);

    // Restore mutation
    const restoreMutation = useMutation({
        mutationFn: async (id) => {
            const url = typeof restoreEndpoint === "function" ? restoreEndpoint(id) : `${fetchUrl}/${id}/restore`;
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
                data?.message || `${entityName} has been successfully restored to active records.`
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
            const matchesSearch = search.trim() === "" || filterFn(item, search.toLowerCase());
            return matchesSearch;
        });
    }, [archivedItems, search, filterFn]);

    const renderedStatCards = useMemo(() => {
        if (typeof statCards === "function") {
            return statCards(archivedItems);
        }
        return statCards;
    }, [statCards, archivedItems]);

    const tableColumns = useMemo(() => {
        return columns((item) => setRestoreTarget(item));
    }, [columns]);

    return (
        <MainLayout title={title}>
            <Head title={title} />

            <div className="space-y-6">
                <Breadcrumbs
                    items={[
                        { label: parentTitle, href: parentHref },
                        { label: "Archives" },
                    ]}
                />

                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => router.visit(parentHref)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-gray-50 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
                                title={`Back to ${parentTitle}`}
                            >
                                <ArrowLeftIcon className="h-4 w-4" />
                            </button>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                {title}
                            </h1>
                        </div>
                        <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                            View and restore archived {parentTitle.toLowerCase()} to the active system.
                        </p>
                    </div>
                </div>

                {/* Stat Cards */}
                {renderedStatCards.length > 0 && (
                    <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-${Math.min(renderedStatCards.length, 3)}`}>
                        {renderedStatCards.map((card, idx) => (
                            <StatCard
                                key={idx}
                                icon={card.icon}
                                label={card.label}
                                value={card.value}
                                tone={card.tone}
                            />
                        ))}
                    </div>
                )}

                {/* Search & Filters */}
                <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm shadow-blue-950/5 sm:flex-row sm:items-center sm:justify-between dark:bg-gray-900 dark:border dark:border-gray-800">
                    <div className="relative flex-1 sm:max-w-md">
                        <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={`Search archived ${parentTitle.toLowerCase()}...`}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-800 dark:bg-gray-800/40 dark:text-white dark:focus:bg-gray-800"
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
                    emptyStateMessage={
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
                            onClick={() => restoreMutation.mutate(restoreTarget[idField])}
                            disabled={restoreMutation.isPending}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
                        >
                            {restoreMutation.isPending && (
                                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                            )}
                            {restoreMutation.isPending ? "Restoring..." : `Restore ${entityName}`}
                        </button>
                    </div>
                </div>
            </Modal>
        </MainLayout>
    );
}
