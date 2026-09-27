import { useEffect, useMemo, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    ArchiveBoxIcon,
    ArrowRightIcon,
    CloudArrowUpIcon,
    MagnifyingGlassIcon,
    UserGroupIcon,
    UserPlusIcon,
    UsersIcon,
} from "@heroicons/react/24/outline";

import MainLayout from "@/Components/Layout/MainLayout";
import Badge from "@/Components/UI/Badge";
import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import DataTable from "@/Components/UI/DataTable";
import SelectDropdown from "@/Components/UI/SelectDropdown";
import StatCard from "@/Components/UI/StatCard";
import api from "@/Services/api";
import { getAuthToken } from "@/Services/auth";
import { activeStudentsQueryKey } from "@/Services/queryKeys";
import { notify } from "@/Services/toast";
import NoImage from "@/assets/images/noImage.webp";
import usePermission from "@/Hooks/usePermission";

const allOption = { label: "All", value: "" };
const yearOrder = ["First Year", "Second Year", "Third Year", "Fourth Year"];

const actionLinks = [
    {
        label: "Bulk Registration",
        href: "/students/bulk-registration",
        icon: UsersIcon,
        permission: "students.create",
    },
    {
        label: "Upload Images",
        href: "/students/bulk-image-upload",
        icon: CloudArrowUpIcon,
        permission: "students.create",
    },
    {
        label: "Single Registration",
        href: "/students/single-registration",
        icon: UserPlusIcon,
        permission: "students.create",
    },
    {
        label: "View Archives",
        href: "/students/archives",
        icon: ArchiveBoxIcon,
        permission: "students.archive",
    },
];

const getCollection = (response) => {
    if (Array.isArray(response?.data?.data)) return response.data.data;
    if (Array.isArray(response?.data)) return response.data;
    return [];
};

const normalizeStudent = (record) => {
    const user = record.user || record || {};
    const student =
        (Array.isArray(record.student)
            ? record.student[0]
            : record.student) || {};
    const program = student.program || record.program || {};
    const department = program.department || record.department || {};
    const profile = record.profile || user.profile || {};
    const rawStatus = student.status || record.status;
    const isEnrolled =
        Boolean(student.student_id) &&
        (!rawStatus ||
            ["active", "enrolled", "registered"].includes(
                String(rawStatus).toLowerCase(),
            ));

    const status = rawStatus || (isEnrolled ? "Active" : "Inactive");

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
        year: student.year || "N/A",
        block: student.block || "N/A",
        status,
        programCode: program.program_code || "N/A",
        programName: program.program_name || "",
        departmentName: department.department_name || "N/A",
        image: profile.imagelink || profile.image_link || "",
        enrolled: isEnrolled,
    };
};

const makeOptions = (items) => [
    allOption,
    ...Array.from(
        new Set(items.filter(Boolean).filter((item) => item !== "N/A")),
    )
        .sort((a, b) => {
            const yearA = yearOrder.indexOf(a);
            const yearB = yearOrder.indexOf(b);

            if (yearA !== -1 || yearB !== -1) {
                return (
                    (yearA === -1 ? 99 : yearA) - (yearB === -1 ? 99 : yearB)
                );
            }

            return String(a).localeCompare(String(b));
        })
        .map((item) => ({ label: item, value: item })),
];

export default function Students() {
    const { can } = usePermission();
    const [search, setSearch] = useState("");
    const [department, setDepartment] = useState("");
    const [program, setProgram] = useState("");
    const [year, setYear] = useState("");
    const [block, setBlock] = useState("");
    const queryClient = useQueryClient();

    const visibleActionLinks = useMemo(
        () => actionLinks.filter((a) => !a.permission || can(a.permission)),
        [can]
    );

    const {
        data: students = [],
        isLoading: loading,
        isFetching,
        isError,
        error,
    } = useQuery({
        queryKey: activeStudentsQueryKey,
        enabled: Boolean(getAuthToken()),
        refetchOnMount: "always",
        queryFn: async () => {
            const token = sessionStorage.getItem("token");
            const response = await api.get("/student/getByActiveSemester", {
                headers: token
                    ? {
                          Authorization: `Bearer ${token}`,
                      }
                    : {},
            });

            return getCollection(response).map(normalizeStudent);
        },
    });

    const refreshStudents = () => {
        queryClient.invalidateQueries({
            queryKey: activeStudentsQueryKey,
        });
    };

    const isUnauthenticated = error?.response?.status === 401;
    const errorMessage = isUnauthenticated
        ? ""
        : error?.response?.data?.message || "Unable to load students right now.";

    useEffect(() => {
        if (isError && !isUnauthenticated && errorMessage) {
            notify.error("Unable to Load Students", errorMessage);
        }
    }, [isError, isUnauthenticated, errorMessage]);

    useEffect(() => {
        setProgram("");
    }, [department]);

    const counts = useMemo(() => {
        const male = students.filter(
            (s) => String(s.sex).toLowerCase() === "male",
        ).length;
        const female = students.filter(
            (s) => String(s.sex).toLowerCase() === "female",
        ).length;

        return {
            total: students.length,
            male,
            female,
        };
    }, [students]);

    const departmentOptions = useMemo(
        () => makeOptions(students.map((student) => student.departmentName)),
        [students],
    );

    const programOptions = useMemo(() => {
        const source = department
            ? students.filter(
                  (student) => student.departmentName === department,
              )
            : students;

        return makeOptions(source.map((student) => student.programCode));
    }, [department, students]);

    const yearOptions = useMemo(
        () => makeOptions(students.map((student) => student.year)),
        [students],
    );

    const blockOptions = useMemo(
        () => makeOptions(students.map((student) => student.block)),
        [students],
    );

    const filteredStudents = useMemo(() => {
        const needle = search.trim().toLowerCase();

        return students.filter((student) => {
            const matchesDepartment = department
                ? student.departmentName === department
                : true;
            const matchesProgram = program
                ? student.programCode === program
                : true;
            const matchesYear = year ? student.year === year : true;
            const matchesBlock = block ? student.block === block : true;
            const matchesSearch = needle
                ? [
                      student.userId,
                      student.fullName,
                      student.programCode,
                      student.departmentName,
                  ]
                      .join(" ")
                      .toLowerCase()
                      .includes(needle)
                : true;

            return (
                matchesDepartment &&
                matchesProgram &&
                matchesYear &&
                matchesBlock &&
                matchesSearch
            );
        });
    }, [block, department, program, search, students, year]);

    const columns = [
        {
            key: "profile",
            header: "Profile",
            width: "86px",
            render: (student) => (
                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                    {student.image ? (
                        <img
                            src={student.image}
                            alt={student.fullName}
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
            render: (student) => (
                <div>
                    <p className="font-semibold text-gray-900">
                        {student.fullName}
                    </p>
                    <p className="text-xs text-gray-400">{student.userId}</p>
                </div>
            ),
        },
        {
            key: "programCode",
            header: "Program",
            minWidth: "120px",
            render: (student) => (
                <div>
                    <p className="font-medium text-gray-800">
                        {student.programCode}
                    </p>
                    {student.programName && (
                        <p className="max-w-44 truncate text-xs text-gray-400">
                            {student.programName}
                        </p>
                    )}
                </div>
            ),
        },
        {
            key: "year",
            header: "Year",
            minWidth: "120px",
        },
        {
            key: "block",
            header: "Block",
            minWidth: "90px",
        },
        {
            key: "action",
            header: "Action",
            width: "90px",
            render: (student) => (
                <button
                    type="button"
                    onClick={() =>
                        router.visit(
                            `/students/student-details?user_id=${student.userId}`,
                        )
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
                    aria-label={`View ${student.fullName}`}
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
            label: "Student ID",
            value: "id_asc",
            sorter: (a, b) => a.userId.localeCompare(b.userId),
        },
    ];

    return (
        <>
            <Head title="Students" />
            <div className="space-y-6">
            <div className="flex min-h-10 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <Breadcrumbs
                        crumbs={[
                            { label: "Dashboard", href: "/dashboard" },
                            { label: "Students" },
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
                    label="Total Students"
                    value={counts.total}
                />
                <StatCard
                    icon={UsersIcon}
                    label="Male"
                    value={counts.male}
                    tone="blue"
                />
                <StatCard
                    icon={UsersIcon}
                    label="Female"
                    value={counts.female}
                    tone="green"
                />
            </div>

            <section className="rounded-xl bg-white p-4 shadow-sm shadow-blue-950/5">
                <div className="grid gap-3 lg:grid-cols-[1.2fr_repeat(4,minmax(130px,180px))]">
                    <div>
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
                                placeholder="Search students..."
                                className="h-11 w-full rounded-xl bg-gray-50 pl-11 pr-4 text-sm text-gray-700 shadow-sm shadow-blue-950/5 outline-none transition placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                    </div>

                    <SelectDropdown
                        label="Department"
                        options={departmentOptions}
                        value={department}
                        onChange={setDepartment}
                    />
                    <SelectDropdown
                        label="Program"
                        options={programOptions}
                        value={program}
                        onChange={setProgram}
                    />
                    <SelectDropdown
                        label="Year"
                        options={yearOptions}
                        value={year}
                        onChange={setYear}
                    />
                    <SelectDropdown
                        label="Block"
                        options={blockOptions}
                        value={block}
                        onChange={setBlock}
                    />
                </div>
            </section>

            <DataTable
                columns={columns}
                data={filteredStudents}
                loading={loading}
                rowKey="userId"
                sortOptions={sortOptions}
                defaultSort="default"
                pageSizeOptions={[10, 25, 50]}
                emptyMessage="No students match the current filters."
            />
        </div>
        </>
    );
}

Students.layout = (page) => <MainLayout>{page}</MainLayout>;
