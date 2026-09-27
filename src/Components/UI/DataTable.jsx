import { useMemo, useState } from "react";
import {
    ChevronLeftIcon,
    ChevronRightIcon,
} from "@heroicons/react/24/outline";
import SelectDropdown from "./SelectDropdown";

export default function DataTable({
    columns = [],
    data = [],
    loading = false,
    emptyMessage = "No records found.",
    rowKey = "id",
    sortOptions = [],
    defaultSort = "",
    pageSizeOptions = [10, 25, 50],
}) {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(pageSizeOptions[0] || 10);
    const [sortValue, setSortValue] = useState(defaultSort);

    const sortedData = useMemo(() => {
        const activeSort = sortOptions.find(
            (option) => option.value === sortValue,
        );

        if (!activeSort?.sorter) {
            return data;
        }

        return [...data].sort(activeSort.sorter);
    }, [data, sortOptions, sortValue]);

    const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const startIndex = (currentPage - 1) * pageSize;
    const visibleRows = sortedData.slice(startIndex, startIndex + pageSize);

    const pageSizeItems = pageSizeOptions.map((option) => ({
        label: `${option} rows`,
        value: option,
    }));

    const getRowKey = (row, index) => {
        if (typeof rowKey === "function") {
            return rowKey(row, index);
        }

        return row[rowKey] ?? index;
    };

    const handlePageSizeChange = (value) => {
        setPageSize(Number(value));
        setPage(1);
    };

    const skeletonRows = Array.from({ length: pageSizeOptions[0] || 5 });

    return (
        <section className="rounded-xl bg-white p-4 shadow-sm shadow-blue-950/5">
            {(sortOptions.length > 0 || pageSizeOptions.length > 0) && (
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-gray-900">
                            Showing {sortedData.length} records
                        </p>
                        <p className="text-xs text-gray-400">
                            Sort and page controls are reusable per table.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        {sortOptions.length > 0 && (
                            <SelectDropdown
                                label="Sort"
                                options={sortOptions.map(
                                    ({ label, value }) => ({ label, value }),
                                )}
                                value={sortValue}
                                onChange={(value) => {
                                    setSortValue(value);
                                    setPage(1);
                                }}
                                className="min-w-44"
                            />
                        )}

                        {pageSizeOptions.length > 0 && (
                            <SelectDropdown
                                label="Rows"
                                options={pageSizeItems}
                                value={pageSize}
                                onChange={handlePageSizeChange}
                                className="min-w-36"
                            />
                        )}
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="min-w-full table-fixed">
                    <thead>
                        <tr className="bg-blue-50 text-left">
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    className={`px-4 py-3 text-xs font-bold uppercase tracking-wide text-blue-700 first:rounded-l-2xl last:rounded-r-2xl ${
                                        column.className || ""
                                    }`}
                                    style={{
                                        width: column.width,
                                        minWidth: column.minWidth,
                                    }}
                                >
                                    {column.header}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                        {loading &&
                            skeletonRows.map((_, rowIndex) => (
                                <tr key={rowIndex}>
                                    {columns.map((column) => (
                                        <td
                                            key={column.key}
                                            className="px-4 py-4"
                                        >
                                            <div className="h-4 w-full animate-pulse rounded-full bg-gray-100" />
                                        </td>
                                    ))}
                                </tr>
                            ))}

                        {!loading &&
                            visibleRows.map((row, rowIndex) => (
                                <tr
                                    key={getRowKey(row, rowIndex)}
                                    className="transition hover:bg-blue-50/40"
                                >
                                    {columns.map((column) => (
                                        <td
                                            key={column.key}
                                            className={`px-4 py-4 text-sm text-gray-600 ${
                                                column.cellClassName || ""
                                            }`}
                                            style={{
                                                width: column.width,
                                                minWidth: column.minWidth,
                                            }}
                                        >
                                            {column.render
                                                ? column.render(row, rowIndex)
                                                : row[column.key] || "N/A"}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>

            {!loading && sortedData.length === 0 && (
                <div className="py-12 text-center">
                    <p className="text-sm font-medium text-gray-500">
                        {emptyMessage}
                    </p>
                </div>
            )}

            {!loading && sortedData.length > 0 && (
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-gray-400">
                        Page {currentPage} of {totalPages}
                    </p>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setPage((value) => value - 1)}
                            disabled={currentPage === 1}
                            className="inline-flex h-9 items-center gap-2 rounded-xl bg-gray-100 px-3 text-sm font-medium text-gray-600 transition hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <ChevronLeftIcon className="h-4 w-4" />
                            Prev
                        </button>

                        <button
                            type="button"
                            onClick={() => setPage((value) => value + 1)}
                            disabled={currentPage === totalPages}
                            className="inline-flex h-9 items-center gap-2 rounded-xl bg-gray-100 px-3 text-sm font-medium text-gray-600 transition hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Next
                            <ChevronRightIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}
