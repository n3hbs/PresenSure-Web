import { useState, useRef, useEffect, useMemo } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeftIcon,
    CloudArrowUpIcon,
    PhotoIcon,
    TrashIcon,
    XMarkIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
} from "@heroicons/react/24/outline";

import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import Button from "@/Components/UI/Button";
import UploadResultsModal from "@/Components/BulkUpload/UploadResultsModal";
import api from "@/Services/api";
import {
    activeStudentsQueryKey,
    instructorsQueryKey,
} from "@/Services/queryKeys";
import { notify } from "@/Services/toast";
import usePermission from "@/Hooks/usePermission";

const VALID_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const USER_ID_REGEX = /^(?:[A-Za-z]-)?\d{4}-\d{4}$/;

export default function BulkImageUploadPage({ type = "student" }) {
    const { can } = usePermission();
    const queryClient = useQueryClient();
    const fileInputRef = useRef(null);

    const isStudent = type === "student";
    const entityLabel = isStudent ? "Student" : "Instructor";
    const entityPlural = isStudent ? "Students" : "Instructors";
    const basePath = isStudent ? "/students" : "/instructors";
    const requiredPermission = isStudent ? "students.create" : "instructors.create";

    useEffect(() => {
        if (!can(requiredPermission)) {
            notify.error(
                "Access Denied",
                `You do not have permission to upload ${entityPlural.toLowerCase()} images.`
            );
            router.visit(basePath);
        }
    }, [can, requiredPermission, entityPlural, basePath]);

    const [selectedFiles, setSelectedFiles] = useState([]);

    // Manage object URLs for memory safety
    useEffect(() => {
        const objectUrls = selectedFiles.map((file) => URL.createObjectURL(file));
        setPreviews(objectUrls);

        return () => {
            objectUrls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [selectedFiles]);

    const handleAddFiles = (incomingFiles) => {
        const fileList = Array.from(incomingFiles || []);
        if (fileList.length === 0) return;

        const validNewFiles = [];
        const rejectedNames = [];

        for (const file of fileList) {
            const ext = file.name.split(".").pop()?.toLowerCase();
            if (!ext || !VALID_EXTENSIONS.includes(ext)) {
                rejectedNames.push(`${file.name} (invalid format)`);
                continue;
            }

            if (file.size > MAX_FILE_SIZE) {
                rejectedNames.push(`${file.name} (exceeds 5MB)`);
                continue;
            }

            // Prevent duplicate file names in selection
            const alreadySelected = selectedFiles.some(
                (f) => f.name === file.name && f.size === file.size
            );
            if (!alreadySelected) {
                validNewFiles.push(file);
            }
        }

        if (rejectedNames.length > 0) {
            notify.warning(
                "Files Skipped",
                `Some files were skipped: ${rejectedNames.slice(0, 3).join(", ")}${
                    rejectedNames.length > 3 ? ` and ${rejectedNames.length - 3} more.` : ""
                }`
            );
        }

        if (validNewFiles.length > 0) {
            setSelectedFiles((prev) => [...prev, ...validNewFiles]);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files) {
            handleAddFiles(e.target.files);
        }
        e.target.value = "";
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer?.files) {
            handleAddFiles(e.dataTransfer.files);
        }
    };

    const handleRemoveFile = (index) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleClearAll = () => {
        setSelectedFiles([]);
    };

    const invalidFormatCount = useMemo(() => {
        return selectedFiles.filter(
            (f) => !USER_ID_REGEX.test(f.name.replace(/\.[^/.]+$/, ""))
        ).length;
    }, [selectedFiles]);

    const totalSizeBytes = useMemo(() => {
        return selectedFiles.reduce((acc, f) => acc + f.size, 0);
    }, [selectedFiles]);

    const formatBytes = (bytes) => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) {
            notify.warning("No Images Selected", "Please select at least one image to upload.");
            return;
        }

        setIsUploading(true);

        const formData = new FormData();
        selectedFiles.forEach((file) => {
            formData.append("images[]", file);
        });
        formData.append("type", "both");
        formData.append("overwrite", overwrite ? "1" : "0");

        try {
            const response = await api.post("/user-profile/bulk-upload", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            const data = response.data?.data || {};
            setUploadResults(data);
            setResultModalOpen(true);
            setSelectedFiles([]);

            notify.success(
                "Upload Complete",
                "Bulk image processing completed successfully."
            );

            // Invalidate both student and instructor queries so all tables stay updated
            queryClient.invalidateQueries({ queryKey: activeStudentsQueryKey });
            queryClient.invalidateQueries({ queryKey: instructorsQueryKey });
        } catch (err) {
            if (err.response?.status === 401) return;

            console.error("Bulk upload error:", err);
            const msg =
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Failed to upload images. Please check your network and try again.";
            notify.error("Upload Failed", msg);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <>
            <Head title={`Bulk ${entityLabel} Image Upload`} />

            <div className="space-y-6">
                {/* Header & Breadcrumbs */}
                <div className="flex min-h-10 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <Breadcrumbs
                            crumbs={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: entityPlural, href: basePath },
                                { label: "Bulk Image Upload" },
                            ]}
                        />
                    </div>

                    <Link
                        href={basePath}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-gray-600 shadow-sm shadow-blue-950/5 transition hover:bg-blue-50 hover:text-blue-700"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        Back to {entityPlural}
                    </Link>
                </div>

                {/* Guidelines & Options Card */}
                <div className="rounded-xl bg-white p-5 shadow-sm shadow-blue-950/5 border border-gray-100">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <InformationCircleIcon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-base font-bold text-gray-900">
                                Instructions & File Naming
                            </h2>
                            <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                                Image file names must be formatted strictly by {entityLabel} User ID like{" "}
                                <strong className="text-gray-900 font-mono">C-0000-0000</strong> or{" "}
                                <strong className="text-gray-900 font-mono">0000-0000</strong> so they can be matched
                                with existing users in the system.
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2 text-xs font-mono">
                                <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-blue-700 border border-blue-100 font-semibold">
                                    Format: C-0000-0000 (e.g. C-2022-0138.jpg)
                                </span>
                                <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-blue-700 border border-blue-100 font-semibold">
                                    Format: 0000-0000 (e.g. 2022-0138.png)
                                </span>
                                <span className="inline-flex items-center rounded-md bg-gray-50 px-2.5 py-1 text-gray-600 border border-gray-200">
                                    Formats: JPG, JPEG, PNG, WEBP (Max 5MB each)
                                </span>
                            </div>

                            {/* Overwrite Checkbox */}
                            <div className="mt-4 pt-3 border-t border-gray-100">
                                <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-gray-700 select-none">
                                    <input
                                        type="checkbox"
                                        checked={overwrite}
                                        onChange={(e) => setOverwrite(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="font-medium">
                                        Overwrite existing profile photos
                                    </span>
                                </label>
                                <p className="ml-6 text-xs text-gray-500">
                                    If checked, users who already have an image will have it replaced. Otherwise, existing photos are preserved.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dropzone & Preview Card */}
                <div className="rounded-xl bg-white p-5 shadow-sm shadow-blue-950/5 border border-gray-100 space-y-5">
                    {/* Drag & Drop Area */}
                    <div
                        onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center ${
                            isDragging
                                ? "border-blue-500 bg-blue-50/50"
                                : "border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:border-blue-300"
                        }`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={handleFileChange}
                        />

                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3">
                            <CloudArrowUpIcon className="h-8 w-8" />
                        </div>

                        <p className="text-sm font-semibold text-gray-700">
                            Click to select or drag and drop image files
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                            Select multiple images at once (named as C-0000-0000 or 0000-0000)
                        </p>
                    </div>

                    {/* Previews Grid */}
                    {selectedFiles.length > 0 && (
                        <div className="space-y-4 pt-2">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-gray-800">
                                            Selected Images ({selectedFiles.length})
                                        </h3>
                                        {invalidFormatCount > 0 && (
                                            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
                                                {invalidFormatCount} invalid ID format
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Total size: {formatBytes(totalSizeBytes)}
                                    </p>
                                </div>

                                <Button
                                    type="button"
                                    variant="danger-outline"
                                    size="sm"
                                    onClick={handleClearAll}
                                >
                                    <TrashIcon className="h-4 w-4 mr-1 text-red-500" />
                                    Clear All
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {selectedFiles.map((file, index) => {
                                    const userId = file.name.replace(/\.[^/.]+$/, "");
                                    const previewUrl = previews[index];
                                    const isValidFormat = USER_ID_REGEX.test(userId);

                                    return (
                                        <div
                                            key={`${file.name}-${index}`}
                                            className={`group relative rounded-lg border overflow-hidden shadow-sm hover:shadow transition ${
                                                isValidFormat
                                                    ? "border-gray-200 bg-white"
                                                    : "border-amber-400 bg-amber-50/20"
                                            }`}
                                        >
                                            <div className="relative aspect-square w-full bg-gray-100">
                                                {previewUrl ? (
                                                    <img
                                                        src={previewUrl}
                                                        alt={file.name}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-gray-300">
                                                        <PhotoIcon className="h-8 w-8" />
                                                    </div>
                                                )}

                                                {/* Remove button */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveFile(index)}
                                                    className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-600 transition"
                                                    title="Remove image"
                                                >
                                                    <XMarkIcon className="h-3.5 w-3.5" />
                                                </button>
                                            </div>

                                            <div className="p-2 text-left">
                                                <div className="flex items-center justify-between gap-1">
                                                    <p
                                                        className={`truncate text-xs font-mono font-bold ${
                                                            isValidFormat ? "text-gray-800" : "text-amber-800"
                                                        }`}
                                                        title={userId}
                                                    >
                                                        {userId}
                                                    </p>
                                                    {!isValidFormat && (
                                                        <span
                                                            className="shrink-0 rounded bg-amber-100 px-1 py-0.2 text-[9px] font-semibold text-amber-800"
                                                            title="Must be formatted as C-0000-0000 or 0000-0000"
                                                        >
                                                            Invalid ID
                                                        </span>
                                                    )}
                                                </div>
                                                <p
                                                    className="truncate text-[10px] text-gray-400"
                                                    title={file.name}
                                                >
                                                    {formatBytes(file.size)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Submit Button */}
                            <div className="flex justify-end pt-4 border-t border-gray-100">
                                <Button
                                    type="button"
                                    onClick={handleUpload}
                                    disabled={isUploading || selectedFiles.length === 0}
                                    className="w-full sm:w-auto"
                                >
                                    <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                                    {isUploading
                                        ? `Uploading ${selectedFiles.length} image(s)...`
                                        : `Upload ${selectedFiles.length} Image(s)`}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Results Modal */}
            <UploadResultsModal
                isOpen={resultModalOpen}
                onClose={() => setResultModalOpen(false)}
                results={uploadResults}
                type={type}
            />
        </>
    );
}
