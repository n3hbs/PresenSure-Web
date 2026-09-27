import { useState, useRef, useEffect } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeftIcon,
    ArrowDownTrayIcon,
    DocumentArrowUpIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    TrashIcon,
    XMarkIcon,
    DocumentTextIcon,
    UsersIcon,
} from "@heroicons/react/24/outline";

import MainLayout from "@/Components/Layout/MainLayout";
import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import Button from "@/Components/UI/Button";
import Modal from "@/Components/UI/Modal";
import api from "@/Services/api";
import { activeStudentsQueryKey } from "@/Services/queryKeys";
import { notify } from "@/Services/toast";
import usePermission from "@/Hooks/usePermission";

export default function BulkRegistration() {
    const { can } = usePermission();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!can("students.create")) {
            notify.error(
                "Access Denied",
                "You do not have permission to perform bulk student registration."
            );
            router.visit("/students");
        }
    }, [can]);

    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("to_enroll");
    const [searchQuery, setSearchQuery] = useState("");
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [resultModalOpen, setResultModalOpen] = useState(false);
    const [saveResult, setSaveResult] = useState(null);

    const [extractedData, setExtractedData] = useState({
        to_enroll: [],
        already_enrolled: [],
        invalid: [],
    });

    const fileInputRef = useRef(null);

    const validExtensions = ["xlsx", "xls", "csv", "txt"];

    const handleFileValidation = (selectedFile) => {
        if (!selectedFile) return;

        const ext = selectedFile.name.split(".").pop()?.toLowerCase();
        if (!ext || !validExtensions.includes(ext)) {
            notify.error("Invalid File Format", "Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.");
            return;
        }

        if (selectedFile.size > 5 * 1024 * 1024) {
            notify.error("File Too Large", "File size exceeds 5MB limit.");
            return;
        }

        setFile(selectedFile);
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileValidation(e.target.files[0]);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileValidation(e.dataTransfer.files[0]);
        }
    };

    const handleExtract = async () => {
        if (!file) {
            notify.warning("No File Selected", "Please select a file to extract.");
            return;
        }

        setIsExtracting(true);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await api.post("/student/bulk-extract", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            const data = response.data?.data || {};
            setExtractedData({
                to_enroll: data.to_enroll || [],
                already_enrolled: data.already_enrolled || [],
                invalid: data.invalid || [],
            });

            const enrolledCount = (data.to_enroll || []).length;
            const invalidCount = (data.invalid || []).length;

            if (enrolledCount > 0) {
                setActiveTab("to_enroll");
                notify.success(
                    "Data Extracted",
                    `Processed ${enrolledCount} student(s) ready to enroll${invalidCount > 0 ? ` (${invalidCount} invalid)` : ""}.`
                );
            } else if ((data.already_enrolled || []).length > 0) {
                setActiveTab("already_enrolled");
                notify.warning(
                    "Already Enrolled",
                    "All students in this file are already enrolled."
                );
            } else if (invalidCount > 0) {
                setActiveTab("invalid");
                notify.error(
                    "Invalid Entries",
                    `Found ${invalidCount} invalid student record(s).`
                );
            }
        } catch (error) {
            if (error.response?.status === 401) return;

            const msg =
                error.response?.data?.message ||
                error.response?.data?.data?.message ||
                "Failed to extract file. Please check format.";
            notify.error("Extraction Failed", msg);
        } finally {
            setIsExtracting(false);
        }
    };

    const handleRemoveRow = (indexToRemove) => {
        setExtractedData((prev) => ({
            ...prev,
            to_enroll: prev.to_enroll.filter((_, idx) => idx !== indexToRemove),
        }));
    };

    const handleSaveStudents = async () => {
        if (extractedData.to_enroll.length === 0) return;

        setIsSaving(true);
        setConfirmModalOpen(false);

        try {
            const response = await api.post("/student/bulk-store", {
                students: extractedData.to_enroll,
            });

            const result = response.data?.data || {};
            setSaveResult(result);
            setResultModalOpen(true);
            setExtractedData({
                to_enroll: [],
                already_enrolled: [],
                invalid: [],
            });
            setFile(null);

            notify.success(
                "Registration Successful",
                "Students have been successfully saved to the database."
            );

            queryClient.invalidateQueries({
                queryKey: activeStudentsQueryKey,
            });
        } catch (error) {
            if (error.response?.status === 401) return;

            const msg =
                error.response?.data?.message ||
                "Failed to save students to database.";
            notify.error("Save Failed", msg);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDownloadTemplate = () => {
        const token = sessionStorage.getItem("token");
        const appUrl = import.meta.env.VITE_APP_URL?.replace(/\/$/, "") || "";
        window.open(`${appUrl}/api/student/bulk-template?token=${token || ""}`, "_blank");
    };

    const currentList = extractedData[activeTab] || [];
    const filteredList = currentList.filter((item) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            item.user_id?.toLowerCase().includes(q) ||
            item.full_name?.toLowerCase().includes(q) ||
            item.program_code?.toLowerCase().includes(q) ||
            item.year?.toLowerCase().includes(q) ||
            item.block?.toLowerCase().includes(q) ||
            item.reason?.toLowerCase().includes(q)
        );
    });

    const hasExtractedData =
        extractedData.to_enroll.length > 0 ||
        extractedData.already_enrolled.length > 0 ||
        extractedData.invalid.length > 0;

    return (
        <>
            <Head title="Bulk Student Registration" />

            <div className="space-y-6">
                {/* Header & Breadcrumbs */}
                <div className="flex min-h-10 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <Breadcrumbs
                            crumbs={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Students", href: "/students" },
                                { label: "Bulk Registration" },
                            ]}
                        />
                    </div>

                    <Link
                        href="/students"
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-gray-600 shadow-sm shadow-blue-950/5 transition hover:bg-blue-50 hover:text-blue-700"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        Back to Students
                    </Link>
                </div>

                {/* Grid: Template Download & File Uploader */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Template Card */}
                    <div className="rounded-xl bg-white p-6 shadow-sm shadow-blue-950/5 border border-gray-100 flex flex-col justify-between">
                        <div>
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-4">
                                <DocumentTextIcon className="h-6 w-6" />
                            </div>
                            <h2 className="text-base font-bold text-gray-900">
                                Excel / CSV Template
                            </h2>
                            <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                                Download our standard template with required columns:
                                <strong className="text-gray-700"> Student ID, Full Name, Gender, Program, Year Level, Block</strong>.
                            </p>
                        </div>

                        <div className="mt-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleDownloadTemplate}
                                className="w-full text-xs py-2.5"
                            >
                                <ArrowDownTrayIcon className="h-4 w-4 mr-1.5" />
                                Download Template
                            </Button>
                        </div>
                    </div>

                    {/* File Uploader Card */}
                    <div className="lg:col-span-2 rounded-xl bg-white p-6 shadow-sm shadow-blue-950/5 border border-gray-100">
                        <h2 className="text-base font-bold text-gray-900 mb-4">
                            Upload Spreadsheet
                        </h2>

                        <div
                            onDragOver={(e) => {
                                e.preventDefault();
                                setIsDragging(true);
                            }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center ${isDragging
                                ? "border-blue-500 bg-blue-50/50"
                                : "border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:border-blue-300"
                                }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileChange}
                                className="hidden"
                            />

                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 mb-3">
                                <DocumentArrowUpIcon className="h-6 w-6" />
                            </div>

                            <p className="text-sm font-semibold text-gray-800">
                                {file ? file.name : "Click to browse or drag and drop file here"}
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                                Supports Excel (.xlsx, .xls) and CSV (.csv) up to 5MB
                            </p>

                            {file && (
                                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                                    <span>{(file.size / 1024).toFixed(1)} KB</span>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFile(null);
                                        }}
                                        className="text-blue-500 hover:text-blue-700"
                                    >
                                        <XMarkIcon className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 flex justify-end">
                            <Button
                                type="button"
                                onClick={handleExtract}
                                disabled={!file || isExtracting}
                                className="px-6"
                            >
                                {isExtracting ? (
                                    <>
                                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                                        Extracting Data...
                                    </>
                                ) : (
                                    "Extract Students"
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Preview & Categorization Section */}
                {hasExtractedData && (
                    <div className="rounded-xl bg-white shadow-sm shadow-blue-950/5 border border-gray-100 overflow-hidden">
                        {/* Header & Tabs */}
                        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-2 overflow-x-auto">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("to_enroll")}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${activeTab === "to_enroll"
                                        ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                >
                                    <span>To Enroll</span>
                                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                                        {extractedData.to_enroll.length}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveTab("already_enrolled")}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${activeTab === "already_enrolled"
                                        ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                >
                                    <span>Already Enrolled</span>
                                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                                        {extractedData.already_enrolled.length}
                                    </span>
                                </button>

                                {extractedData.invalid.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("invalid")}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${activeTab === "invalid"
                                            ? "bg-red-600 text-white shadow-sm shadow-red-200"
                                            : "bg-red-50 text-red-700 hover:bg-red-100"
                                            }`}
                                    >
                                        <span>Invalid Rows</span>
                                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                                            {extractedData.invalid.length}
                                        </span>
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    type="search"
                                    placeholder="Search preview..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                />

                                {activeTab === "to_enroll" && extractedData.to_enroll.length > 0 && (
                                    <Button
                                        type="button"
                                        onClick={() => setConfirmModalOpen(true)}
                                        disabled={isSaving}
                                        className="h-9 px-4 text-xs font-semibold whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200"
                                    >
                                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                                        Save ({extractedData.to_enroll.length}) to Database
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            {filteredList.length === 0 ? (
                                <div className="p-8 text-center text-sm text-gray-400">
                                    No records found in this category.
                                </div>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                                    <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3">ID Number</th>
                                            <th className="px-4 py-3">Full Name</th>
                                            {activeTab !== "invalid" ? (
                                                <>
                                                    <th className="px-4 py-3">Sex</th>
                                                    <th className="px-4 py-3">Program</th>
                                                    <th className="px-4 py-3">Year</th>
                                                    <th className="px-4 py-3">Block</th>
                                                    {activeTab === "to_enroll" && (
                                                        <th className="px-4 py-3 text-right">Action</th>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <th className="px-4 py-3">Row #</th>
                                                    <th className="px-4 py-3">Error Reason</th>
                                                </>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {filteredList.map((item, idx) => (
                                            <tr key={item.user_id + idx} className="hover:bg-blue-50/40 transition">
                                                <td className="px-4 py-3 font-mono font-medium text-gray-800 text-xs">
                                                    {item.user_id}
                                                </td>
                                                <td className="px-4 py-3 font-medium text-gray-900">
                                                    {item.full_name || `${item.last_name}, ${item.first_name}`}
                                                </td>
                                                {activeTab !== "invalid" ? (
                                                    <>
                                                        <td className="px-4 py-3 text-gray-600 text-xs">
                                                            {item.sex}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-800 font-medium text-xs">
                                                            {item.program_code}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-600 text-xs">
                                                            {item.year}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-600 text-xs">
                                                            {item.block}
                                                        </td>
                                                        {activeTab === "to_enroll" && (
                                                            <td className="px-4 py-3 text-right">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveRow(idx)}
                                                                    className="rounded p-1 text-gray-400 hover:text-red-600 transition"
                                                                    title="Remove from batch"
                                                                >
                                                                    <TrashIcon className="h-4 w-4" />
                                                                </button>
                                                            </td>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                                                            Row {item.row}
                                                        </td>
                                                        <td className="px-4 py-3 text-red-600 text-xs font-medium">
                                                            {item.reason}
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            <Modal
                isOpen={confirmModalOpen}
                onClose={() => setConfirmModalOpen(false)}
                title="Confirm Bulk Registration"
                description={`Are you sure you want to register and enroll ${extractedData.to_enroll.length} students into the active semester?`}
                icon={<UsersIcon className="h-6 w-6 text-blue-600" />}
                iconBg="bg-blue-50 text-blue-600"
                footer={
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setConfirmModalOpen(false)}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSaveStudents}
                            disabled={isSaving}
                        >
                            {isSaving ? "Saving..." : "Yes, Enroll Students"}
                        </Button>
                    </>
                }
            />

            {/* Success Result Modal */}
            <Modal
                isOpen={resultModalOpen}
                onClose={() => setResultModalOpen(false)}
                title="Bulk Enrollment Completed"
                description="Students have been successfully registered and enrolled."
                icon={<CheckCircleIcon className="h-6 w-6 text-green-600" />}
                iconBg="bg-green-50 text-green-600"
                footer={
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setResultModalOpen(false)}
                        >
                            Upload Another File
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                queryClient.invalidateQueries({
                                    queryKey: activeStudentsQueryKey,
                                });
                                router.visit("/students");
                            }}
                        >
                            View Students List
                        </Button>
                    </>
                }
            >
                {saveResult && (
                    <div className="rounded-xl bg-gray-50 p-4 border border-gray-100 space-y-2 text-xs">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Successfully Enrolled:</span>
                            <span className="font-bold text-green-600">
                                {saveResult.enrolled_count}
                            </span>
                        </div>
                        {saveResult.skipped_count > 0 && (
                            <div className="flex justify-between">
                                <span className="text-gray-500">Skipped (Already enrolled):</span>
                                <span className="font-bold text-gray-600">
                                    {saveResult.skipped_count}
                                </span>
                            </div>
                        )}
                        {saveResult.errors && saveResult.errors.length > 0 && (
                            <div className="mt-2 text-red-600 font-medium">
                                Warnings: {saveResult.errors.join(", ")}
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </>
    );
}

BulkRegistration.layout = (page) => <MainLayout>{page}</MainLayout>;
