import { useEffect, useMemo, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    AcademicCapIcon,
    ArchiveBoxIcon,
    ArrowRightIcon,
    BuildingOffice2Icon,
    CloudArrowUpIcon,
    MagnifyingGlassIcon,
    UserGroupIcon,
    UserPlusIcon,
} from "@heroicons/react/24/outline";

import MainLayout from "@/Components/Layout/MainLayout";
import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import DataTable from "@/Components/UI/DataTable";
import SelectDropdown from "@/Components/UI/SelectDropdown";
import StatCard from "@/Components/UI/StatCard";
import api from "@/Services/api";
import { getAuthToken } from "@/Services/auth";
import { instructorsQueryKey } from "@/Services/queryKeys";
import { notify } from "@/Services/toast";
import NoImage from "@/assets/images/noImage.webp";
import usePermission from "@/Hooks/usePermission";

const allOption = { label: "All", value: "" };

const actionLinks = [
    {
        label: "Upload Images",
        href: "/instructors/bulk-image-upload",
        icon: CloudArrowUpIcon,
        permission: "instructors.create",
    },
    {
        label: "Single Registration",
        href: "/instructors/single-registration",
        icon: UserPlusIcon,
        permission: "instructors.create",
    },
    {
        label: "View Archives",
        href: "/instructors/archives",
        icon: ArchiveBoxIcon,
        permission: "instructors.archive",
    },
];

const getCollection = (response) => {
    if (Array.isArray(response?.data?.data)) return response.data.data;
    if (Array.isArray(response?.data)) return response.data;
    return [];
};

const normalizeInstructor = (record) => {
    const user = record.user || record;
    const instructor = Array.isArray(record.instructor)
        ? record.instructor[0]
        : record.instructor || {};
    const department = instructor.department || record.department || {};
    const profile = record.profile || user.profile || {};
    const status = instructor.status || record.status || "Active";

    const fullName = [
        user.last_name,
        user.first_name,
        user.suffix,
        user.middle_initial,
    ]
        .filter(Boolean)
        .join(" ");

    return {
        id: user.user_id,
        userId: user.user_id || "N/A",
        firstName: user.first_name || "",
        lastName: user.last_name || "",
        middleInitial: user.middle_initial || "",
        suffix: user.suffix || "",
        fullName: fullName || "N/A",
        sex: user.sex || "N/A",
        status: status || "Active",
        departmentName: department.department_name || "N/A",
        departmentCode: department.department_code || "N/A",
        image: profile.imagelink || profile.image_link || "",
        createdAt: user.created_at || record.created_at || null,
        isActive:
            !status ||
            ["active", "enrolled", "registered"].includes(
                String(status).toLowerCase(),
            ),
    };
};

const makeOptions = (items) => [
    allOption,
    ...Array.from(
        new Set(items.filter(Boolean).filter((item) => item !== "N/A")),
    )
        .sort((a, b) => String(a).localeCompare(String(b)))
        .map((item) => ({ label: item, value: item })),
];

export default function Instructors() {
    const { can } = usePermission();
    const [search, setSearch] = useState("");
    const [department, setDepartment] = useState("");
    const queryClient = useQueryClient();

    const visibleActionLinks = useMemo(
        () => actionLinks.filter((a) => !a.permission || can(a.permission)),
        [can]
    );

    const {
        data: instructors = [],
        isLoading: loading,
        isError,
        error,
    } = useQuery({
        queryKey: instructorsQueryKey,
        enabled: Boolean(getAuthToken()),
        queryFn: async () => {
            const token = sessionStorage.getItem("token");
            const response = await api.get("/instructors", {
                headers: token
                    ? {
                        Authorization: `Bearer ${token}`,
                    }
                    : {},
            });

            return getCollection(response).map(normalizeInstructor);
        },
    });

    const refreshInstructors = () => {
        queryClient.invalidateQueries({
            queryKey: instructorsQueryKey,
        });
    };

    const isUnauthenticated = error?.response?.status === 401;
    const errorMessage = isUnauthenticated
        ? ""
        : error?.response?.data?.message || "Unable to load instructors right now.";

    useEffect(() => {
        if (isError && !isUnauthenticated && errorMessage) {
            notify.error("Unable to Load Instructors", errorMessage);
        }
    }, [isError, isUnauthenticated, errorMessage]);

    const counts = useMemo(() => {
        const uniqueDepartments = new Set(
            instructors
                .map((instructor) => instructor.departmentName)
                .filter((dept) => dept && dept !== "N/A"),
        );
        const assigned = instructors.filter(
            (instructor) =>
                instructor.departmentName &&
                instructor.departmentName !== "N/A",
        ).length;

        return {
            total: instructors.length,
            departments: uniqueDepartments.size,
            assigned,
        };
    }, [instructors]);

    const departmentOptions = useMemo(
        () =>
            makeOptions(
                instructors.map((instructor) => instructor.departmentName),
            ),
        [instructors],
    );

    const filteredInstructors = useMemo(() => {
        const needle = search.trim().toLowerCase();

        return instructors.filter((instructor) => {
            const matchesDepartment = department
                ? instructor.departmentName === department
                : true;
            const matchesSearch = needle
                ? [
                    instructor.userId,
                    instructor.fullName,
                    instructor.departmentName,
                    instructor.departmentCode,
                    instructor.sex,
                ]
                    .join(" ")
                    .toLowerCase()
                    .includes(needle)
                : true;

            return matchesDepartment && matchesSearch;
        });
    }, [department, search, instructors]);

    const columns = [
        {
            key: "profile",
            header: "Profile",
            width: "86px",
            render: (instructor) => (
                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                    {instructor.image ? (
                        <img
                            src={instructor.image}
                            alt={instructor.fullName}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <img
                            src={NoImage}
                            alt={NoImage}
                            className="h-full w-full object-cover"
                        />
                    )}
                </div>
            ),
        },
        {
            key: "fullName",
            header: "Full Name",
            minWidth: "240px",
            render: (instructor) => (
                <div>
                    <p className="font-semibold text-gray-900">
                        {instructor.fullName}
                    </p>
                    <p className="text-xs text-gray-400">{instructor.userId}</p>
                </div>
            ),
        },
        {
            key: "departmentName",
            header: "Department",
            minWidth: "180px",
            render: (instructor) => (
                <div>
                    <p className="font-medium text-gray-800">
                        {instructor.departmentName}
                    </p>
                    {instructor.departmentCode !== "N/A" && (
                        <p className="text-xs text-gray-400">
                            {instructor.departmentCode}
                        </p>
                    )}
                </div>
            ),
        },
        {
            key: "action",
            header: "Action",
            width: "90px",
            render: (instructor) => (
                <button
                    type="button"
                    onClick={() =>
                        router.visit(
                            `/instructors/instructor-details?user_id=${instructor.userId}`,
                        )
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
                    aria-label={`View ${instructor.fullName}`}
                >
                    <ArrowRightIcon className="h-4 w-4" />
                </button>
            ),
        },
    ];

    const sortOptions = [
        {
            label: "Default",
            value: "default",
            sorter: (a, b) =>
                new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
        },
        {
            label: "Name A-Z",
            value: "name_asc",
            sorter: (a, b) => a.fullName.localeCompare(b.fullName),
        },
        {
            label: "Name Z-A",
            value: "name_desc",
            sorter: (a, b) => b.fullName.localeCompare(a.fullName),
        },
        {
            label: "Instructor ID",
            value: "id_asc",
            sorter: (a, b) => a.userId.localeCompare(b.userId),
        },
        {
            label: "Department",
            value: "department_asc",
            sorter: (a, b) =>
                a.departmentName.localeCompare(b.departmentName),
        },
    ];

    return (
        <>
            <Head title="Instructors" />
            <div className="space-y-6">
                <div className="flex min-h-10 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <Breadcrumbs
                            crumbs={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Instructors" },
                            ]}
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
                        {visibleActionLinks.map(({ label, href, icon: Icon }) => (
                            <Link
                                key={href}
                                href={href}
                                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
                            >
                                <Icon className="h-4 w-4" />
                                <span className="hidden sm:inline">{label}</span>
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <StatCard
                        icon={UserGroupIcon}
                        label="Total Instructors"
                        value={counts.total}
                    />
                    <StatCard
                        icon={BuildingOffice2Icon}
                        label="Departments"
                        value={counts.departments}
                        tone="blue"
                    />
                    <StatCard
                        icon={AcademicCapIcon}
                        label="Assigned"
                        value={counts.assigned}
                        tone="green"
                    />
                </div>

                <section className="rounded-xl bg-white p-4 shadow-sm shadow-blue-950/5">
                    <div className="flex items-end gap-3">
                        <div className="flex-1">
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                                Search
                            </label>
                            <div className="relative">
                                <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Search instructors..."
                                    className="h-11 w-full rounded-xl bg-gray-50 pl-11 pr-4 text-sm text-gray-700 shadow-sm shadow-blue-950/5 outline-none transition placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                        </div>

                        <div className="w-48 sm:w-60 shrink-0">
                            <SelectDropdown
                                label="Department"
                                options={departmentOptions}
                                value={department}
                                onChange={setDepartment}
                            />
                        </div>
                    </div>
                </section>

                <DataTable
                    columns={columns}
                    data={filteredInstructors}
                    loading={loading}
                    rowKey="userId"
                    sortOptions={sortOptions}
                    defaultSort="default"
                    pageSizeOptions={[10, 25, 50]}
                    emptyMessage="No instructors match the current filters."
                />
            </div>
        </>
    );
}

Instructors.layout = (page) => <MainLayout>{page}</MainLayout>;
