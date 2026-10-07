import { useEffect, useMemo, useState } from "react";
import { Head, router } from "@inertiajs/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeftIcon,
    CalendarDaysIcon,
    CheckCircleIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    LockClosedIcon,
} from "@heroicons/react/24/outline";

import Breadcrumbs from "@/Components/UI/Breadcrumbs";
import Button from "@/Components/UI/Button";
import Stepper from "@/Components/UI/Stepper";
import DiscardRegistrationModal from "@/Components/UI/DiscardRegistrationModal";
import { ReviewGroup, ReviewItem } from "@/Components/UI/ReviewSection";
import SemesterFormSkeleton from "@/Components/AcademicYears/SemesterFormSkeleton";
import DatePickerInput, { formatDisplayDate } from "@/Components/UI/DatePickerInput";
import api from "@/Services/api";
import { notify } from "@/Services/toast";
import {
    schoolYearsQueryKey,
    semestersQueryKey,
    activeSemesterQueryKey,
} from "@/Services/queryKeys";
import usePermission from "@/Hooks/usePermission";
import useFetchData from "@/Hooks/useFetchData";
import useFormDiscardWarning from "@/Hooks/useFormDiscardWarning";

const PERIOD_CONFIG = [
    { key: "prelim", label: "Prelim", placeholder: "First examination period" },
    { key: "midterm", label: "Midterm", placeholder: "Mid-semester grading period" },
    { key: "prefinals", label: "Prefinals", placeholder: "Pre-final assessment period" },
    { key: "finals", label: "Finals", placeholder: "Culminating semester examination period" },
];

const TERMS = ["First Semester", "Second Semester", "Summer"];

const steps = [
    { number: 1, label: "Semester Details" },
    { number: 2, label: "Academic Periods" },
    { number: 3, label: "Review" },
];

export default function SemesterForm({
    mode = "create",
    semesterId = null,
    initialData = null,
    isLoadingData = false,
}) {
    const isEdit = mode === "edit";
    const { can, hasRole } = usePermission();
    const queryClient = useQueryClient();
    const [currentStep, setCurrentStep] = useState(1);
    const [isInitialized, setIsInitialized] = useState(false);

    // Permission guard
    useEffect(() => {
        if (!hasRole("administrator") && !can("semesters.manage")) {
            notify.error(
                "Access Denied",
                `You do not have permission to ${isEdit ? "edit" : "create"} semesters.`
            );
            router.visit("/semesters");
        }
    }, [can, hasRole, isEdit]);

    // School years lookup using reusable useFetchData
    const { data: schoolYears = [], isLoading: loadingSchoolYears } = useFetchData(
        schoolYearsQueryKey,
        "/semesters/school-years"
    );

    // Form states
    const [form, setForm] = useState({
        school_year_id: "",
        term: "First Semester",
        semester_start: "",
        semester_end: "",
        remarks: "",
    });

    const [periods, setPeriods] = useState([
        { name: "prelim", enabled: false, period_id: null, period_start: "", period_end: "", description: "", hasAttendanceSessions: false },
        { name: "midterm", enabled: false, period_id: null, period_start: "", period_end: "", description: "", hasAttendanceSessions: false },
        { name: "prefinals", enabled: false, period_id: null, period_start: "", period_end: "", description: "", hasAttendanceSessions: false },
        { name: "finals", enabled: false, period_id: null, period_start: "", period_end: "", description: "", hasAttendanceSessions: false },
    ]);

    const [fieldErrors, setFieldErrors] = useState({});

    // Populate initial data when editing
    useEffect(() => {
        if (!isEdit || !initialData || isInitialized) return;

        setForm({
            school_year_id: String(initialData.school_year?.school_year_id || initialData.school_year_id || ""),
            term: initialData.term || "First Semester",
            semester_start: initialData.semester_start || "",
            semester_end: initialData.semester_end || "",
            remarks: initialData.remarks || "",
        });

        const existingPeriodsMap = {};
        if (Array.isArray(initialData.periods)) {
            initialData.periods.forEach((p) => {
                const rawName = (p.name || "").toLowerCase().trim();
                const key =
                    rawName === "prefinal"
                        ? "prefinals"
                        : rawName === "final"
                          ? "finals"
                          : rawName;
                existingPeriodsMap[key] = p;
            });
        }

        setPeriods(
            PERIOD_CONFIG.map(({ key }) => {
                const existing = existingPeriodsMap[key];
                return {
                    name: key,
                    enabled: Boolean(existing),
                    period_id: existing?.period_id || null,
                    period_start: existing?.period_start || "",
                    period_end: existing?.period_end || "",
                    description: existing?.description || "",
                    hasAttendanceSessions: Boolean(
                        existing?.attendance_sessions_count > 0 ||
                        (existing?.attendance_sessions && existing.attendance_sessions.length > 0)
                    ),
                };
            })
        );

        setIsInitialized(true);
    }, [isEdit, initialData, isInitialized]);

    // Set default school year for create mode
    useEffect(() => {
        if (!isEdit && schoolYears.length > 0 && !form.school_year_id) {
            setForm((prev) => ({ ...prev, school_year_id: String(schoolYears[0].school_year_id) }));
        }
    }, [isEdit, schoolYears, form.school_year_id]);

    const todayDate = useMemo(() => new Date().toISOString().split("T")[0], []);

    const selectedSchoolYear = useMemo(() => {
        return schoolYears.find((sy) => String(sy.school_year_id) === String(form.school_year_id));
    }, [schoolYears, form.school_year_id]);

    const defaultDiscardUrl = useMemo(
        () => (isEdit && semesterId ? `/semesters/semester-details?semester_id=${semesterId}` : "/semesters"),
        [isEdit, semesterId]
    );

    const isFormDirty = useMemo(() => {
        if (!isEdit) {
            return (
                currentStep > 1 ||
                Boolean(form.semester_start) ||
                Boolean(form.semester_end) ||
                Boolean(form.remarks) ||
                periods.some((p) => p.enabled)
            );
        }
        if (initialData) {
            const startChanged = form.semester_start !== (initialData.semester_start || "");
            const endChanged = form.semester_end !== (initialData.semester_end || "");
            const remarksChanged = (form.remarks || "") !== (initialData.remarks || "");
            const periodsChanged = periods.some((p) => {
                const orig = (initialData.periods || []).find((op) => op.name?.toLowerCase() === p.name?.toLowerCase());
                if (!orig && p.enabled) return true;
                if (orig && (!p.enabled || p.period_start !== orig.period_start || p.period_end !== orig.period_end)) return true;
                return false;
            });
            return currentStep > 1 || startChanged || endChanged || remarksChanged || periodsChanged;
        }
        return false;
    }, [isEdit, initialData, currentStep, form, periods]);

    const {
        confirmDiscardOpen,
        cancelDiscard,
        proceedWithDiscard,
        triggerDiscard,
        allowNavigation,
    } = useFormDiscardWarning(isFormDirty, defaultDiscardUrl);

    // Mutation for create / update
    const formMutation = useMutation({
        mutationFn: async (payload) => {
            if (isEdit) {
                const res = await api.put(`/semesters/${semesterId}`, payload);
                return res.data;
            }
            const res = await api.post("/semesters", payload);
            return res.data;
        },
        onSuccess: (data) => {
            allowNavigation();
            queryClient.invalidateQueries({ queryKey: semestersQueryKey });
            queryClient.invalidateQueries({ queryKey: activeSemesterQueryKey });
            if (isEdit && semesterId) {
                queryClient.invalidateQueries({ queryKey: ["semesters", semesterId] });
            }

            notify.success(
                isEdit ? "Semester Updated" : "Semester Created",
                data?.message || (isEdit ? "Academic semester and periods updated successfully." : "New academic semester registered successfully.")
            );

            if (isEdit && semesterId) {
                router.visit(`/semesters/semester-details?semester_id=${semesterId}`, { force: true });
            } else {
                router.visit("/semesters", { force: true });
            }
        },
        onError: (err) => {
            const errors = err.response?.data?.data?.errors || err.response?.data?.errors || {};
            setFieldErrors(errors);
            const msg =
                err.response?.data?.message ||
                `Failed to ${isEdit ? "update" : "save"} semester. Please check the inputs.`;
            notify.error(isEdit ? "Update Failed" : "Registration Failed", msg);
        },
    });

    const handleTextChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (fieldErrors[name]) {
            setFieldErrors((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const handlePeriodToggle = (index) => {
        setPeriods((prev) => {
            const updated = [...prev];
            const target = updated[index];

            if (target.hasAttendanceSessions && target.enabled) {
                notify.warning(
                    "Action Restricted",
                    "Cannot disable this period because attendance sessions are already registered under it."
                );
                return prev;
            }

            updated[index] = {
                ...target,
                enabled: !target.enabled,
                period_start: !target.enabled ? form.semester_start : "",
                period_end: !target.enabled ? form.semester_end : "",
            };
            return updated;
        });
    };

    const handlePeriodChange = (index, field, value) => {
        setPeriods((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });

        const errorKey = `periods.${index}.${field}`;
        if (fieldErrors[errorKey]) {
            setFieldErrors((prev) => {
                const next = { ...prev };
                delete next[errorKey];
                return next;
            });
        }
    };

    // Auto distribute dates evenly across enabled periods
    const autoDistributeDates = () => {
        if (!form.semester_start || !form.semester_end) {
            notify.error("Missing Dates", "Please set semester start and end dates first.");
            return;
        }

        const enabledIndices = periods
            .map((p, idx) => (p.enabled ? idx : null))
            .filter((idx) => idx !== null);

        if (enabledIndices.length === 0) {
            notify.warning("No Periods Enabled", "Please enable at least one academic period to distribute dates.");
            return;
        }

        const start = new Date(form.semester_start).getTime();
        const end = new Date(form.semester_end).getTime();

        if (end <= start) {
            notify.error("Invalid Dates", "Semester end date must be after start date.");
            return;
        }

        const totalDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
        const chunk = Math.floor(totalDays / enabledIndices.length);

        setPeriods((prev) => {
            const next = [...prev];
            enabledIndices.forEach((periodIdx, i) => {
                const pStart = new Date(start + i * chunk * 86400000);
                const pEnd =
                    i === enabledIndices.length - 1
                        ? new Date(end)
                        : new Date(start + ((i + 1) * chunk - 1) * 86400000);

                next[periodIdx] = {
                    ...next[periodIdx],
                    period_start: pStart.toISOString().split("T")[0],
                    period_end: pEnd.toISOString().split("T")[0],
                };
            });
            return next;
        });

        notify.success("Dates Distributed", "Academic periods distributed evenly across semester.");
    };

    // Validation for Step 1
    const validateStep1 = () => {
        const errors = {};
        if (!form.school_year_id) errors.school_year_id = "Please select a school year.";
        if (!form.term) errors.term = "Please select an academic term.";
        if (!form.semester_start) {
            errors.semester_start = "Semester start date is required.";
        }
        if (!form.semester_end) {
            errors.semester_end = "Semester end date is required.";
        } else if (form.semester_start && form.semester_end <= form.semester_start) {
            errors.semester_end = "End date must be strictly after the start date.";
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Validation for Step 2
    const validateStep2 = () => {
        const errors = {};
        const enabledPeriods = periods.filter((p) => p.enabled);

        if (enabledPeriods.length === 0) {
            errors.general = "Please configure at least one academic period (e.g. Midterm or Finals).";
        }

        periods.forEach((p, idx) => {
            if (p.enabled) {
                if (!p.period_start) {
                    errors[`periods.${idx}.period_start`] = "Start date is required.";
                }
                if (!p.period_end) {
                    errors[`periods.${idx}.period_end`] = "End date is required.";
                } else if (p.period_start && p.period_end <= p.period_start) {
                    errors[`periods.${idx}.period_end`] = "End date must be after start date.";
                }

                if (p.period_start && (p.period_start < form.semester_start || p.period_start > form.semester_end)) {
                    errors[`periods.${idx}.period_start`] = "Period start must fall within the semester dates.";
                }
                if (p.period_end && (p.period_end < form.semester_start || p.period_end > form.semester_end)) {
                    errors[`periods.${idx}.period_end`] = "Period end must fall within the semester dates.";
                }
            }
        });

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleNext = () => {
        if (currentStep === 1) {
            if (validateStep1()) setCurrentStep(2);
        } else if (currentStep === 2) {
            if (validateStep2()) setCurrentStep(3);
        }
    };

    const handleBack = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 1));
    };

    const handleSubmit = () => {
        if (!validateStep1()) {
            setCurrentStep(1);
            return;
        }
        if (!validateStep2()) {
            setCurrentStep(2);
            return;
        }

        const payload = {
            school_year_id: form.school_year_id,
            term: form.term,
            semester_start: form.semester_start,
            semester_end: form.semester_end,
            remarks: form.remarks || null,
            periods: periods
                .filter((p) => p.enabled && p.period_start && p.period_end)
                .map((p) => ({
                    period_id: p.period_id,
                    name: p.name,
                    period_start: p.period_start,
                    period_end: p.period_end,
                    description: p.description || null,
                })),
        };

        formMutation.mutate(payload);
    };

    if (isLoadingData) {
        return (
            <>
                <Head title={isEdit ? "Edit Semester" : "Create Semester"} />
                <SemesterFormSkeleton />
            </>
        );
    }

    return (
        <>
            <Head title={isEdit ? "Edit Semester" : "Create Semester"} />

            <DiscardRegistrationModal
                isOpen={confirmDiscardOpen}
                onClose={cancelDiscard}
                onDiscard={proceedWithDiscard}
                title={isEdit ? "Discard Changes?" : "Discard Semester?"}
                description={
                    isEdit
                        ? "Are you sure you want to discard your edits? Any unsaved modifications to this semester will be lost."
                        : "Are you sure you want to cancel? Any details entered will not be saved."
                }
            />

            <div className="space-y-6">
                <div className="flex min-h-10 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <Breadcrumbs
                            items={[
                                { label: "Dashboard", href: "/dashboard" },
                                { label: "Academic Years", href: "/semesters" },
                                ...(isEdit && semesterId
                                    ? [
                                          {
                                              label:
                                                  form.term ||
                                                  initialData?.term ||
                                                  semesterId ||
                                                  "Details",
                                              href: `/semesters/semester-details?semester_id=${semesterId}`,
                                          },
                                      ]
                                    : []),
                                { label: isEdit ? "Edit" : "Create Semester" },
                            ]}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => triggerDiscard(defaultDiscardUrl)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-gray-600 shadow-sm shadow-blue-950/5 transition hover:bg-blue-50 hover:text-blue-700 dark:border dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        <span>{isEdit ? "Back to Details" : "Back to Academic Years"}</span>
                    </button>
                </div>

                <Stepper steps={steps} currentStep={currentStep} onStepClick={setCurrentStep} />

                {/* ================= STEP 1: SEMESTER DETAILS ================= */}
                {currentStep === 1 && (
                    <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm shadow-blue-950/5 dark:border dark:border-white/5 dark:bg-[#12131C]">
                        <div className="flex items-center gap-3 border-b border-gray-100 pb-4 dark:border-white/10">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                                <CalendarDaysIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                    Semester Details
                                </h2>
                                <p className="text-sm text-gray-400 dark:text-slate-400">
                                    Define the academic calendar year, term, and boundary dates.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            {/* School Year */}
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-slate-400">
                                    School Year <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="school_year_id"
                                    value={form.school_year_id}
                                    onChange={handleTextChange}
                                    disabled={loadingSchoolYears || isEdit}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white dark:disabled:bg-white/5 dark:disabled:text-slate-500 disabled:bg-gray-50"
                                >
                                    {schoolYears.map((sy) => (
                                        <option key={sy.school_year_id} value={sy.school_year_id}>
                                            AY {sy.year_range}
                                        </option>
                                    ))}
                                </select>
                                {isEdit && (
                                    <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                                        School Year cannot be altered for an existing semester.
                                    </p>
                                )}
                                {fieldErrors.school_year_id && (
                                    <p className="mt-1 text-xs text-red-500">{fieldErrors.school_year_id}</p>
                                )}
                            </div>

                            {/* Academic Term */}
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-slate-400">
                                    Academic Term <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="term"
                                    value={form.term}
                                    onChange={handleTextChange}
                                    disabled={isEdit}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white dark:disabled:bg-white/5 dark:disabled:text-slate-500 disabled:bg-gray-50"
                                >
                                    {TERMS.map((t) => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                                {isEdit && (
                                    <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                                        Term cannot be altered for an existing semester.
                                    </p>
                                )}
                                {fieldErrors.term && (
                                    <p className="mt-1 text-xs text-red-500">{fieldErrors.term}</p>
                                )}
                            </div>

                            {/* Start Date */}
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-slate-400">
                                    Semester Start Date <span className="text-red-500">*</span>
                                </label>
                                <DatePickerInput
                                    name="semester_start"
                                    value={form.semester_start}
                                    onChange={handleTextChange}
                                    error={fieldErrors.semester_start}
                                />
                                {fieldErrors.semester_start && (
                                    <p className="mt-1 text-xs text-red-500">{fieldErrors.semester_start}</p>
                                )}
                            </div>

                            {/* End Date */}
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-slate-400">
                                    Semester End Date <span className="text-red-500">*</span>
                                </label>
                                <DatePickerInput
                                    name="semester_end"
                                    value={form.semester_end}
                                    min={form.semester_start || (!isEdit ? todayDate : undefined)}
                                    onChange={handleTextChange}
                                    error={fieldErrors.semester_end}
                                />
                                {fieldErrors.semester_end && (
                                    <p className="mt-1 text-xs text-red-500">{fieldErrors.semester_end}</p>
                                )}
                            </div>

                            {/* Remarks */}
                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-slate-400">
                                    Remarks / Notes (Optional)
                                </label>
                                <textarea
                                    name="remarks"
                                    rows={3}
                                    value={form.remarks}
                                    onChange={handleTextChange}
                                    placeholder="Enter administrative notes, special academic guidelines, or orientation remarks..."
                                    className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-[#161824]"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-between dark:border-white/10">
                            <Button type="button" variant="outline" onClick={() => triggerDiscard(defaultDiscardUrl)}>
                                Discard
                            </Button>
                            <Button type="button" onClick={handleNext}>
                                Next: Academic Periods
                            </Button>
                        </div>
                    </section>
                )}

                {/* ================= STEP 2: ACADEMIC PERIODS ================= */}
                {currentStep === 2 && (
                    <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm shadow-blue-950/5 dark:border dark:border-white/5 dark:bg-[#12131C]">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-4 dark:border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400">
                                    <ClockIcon className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                        Academic Grading Periods
                                    </h2>
                                    <p className="text-sm text-gray-400 dark:text-slate-400">
                                        Configure examination milestones and assessment boundaries.
                                    </p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={autoDistributeDates}
                                className="self-start sm:self-auto"
                            >
                                <InformationCircleIcon className="h-4 w-4 mr-1.5 text-blue-500" />
                                Auto-Distribute Dates
                            </Button>
                        </div>

                        {fieldErrors.general && (
                            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
                                <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
                                <span>{fieldErrors.general}</span>
                            </div>
                        )}

                        <div className="space-y-3">
                            {PERIOD_CONFIG.map(({ key, label }, idx) => {
                                const period = periods[idx];
                                const isEnabled = period?.enabled;

                                return (
                                    <div
                                        key={key}
                                        className={`rounded-xl border transition-all ${
                                            isEnabled
                                                ? "border-blue-200 bg-blue-50/20 dark:border-blue-900/50 dark:bg-blue-950/10"
                                                : "border-gray-100 bg-gray-50/50 opacity-60 dark:border-white/5 dark:bg-white/[0.02]"
                                        } p-4`}
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    id={`period-enable-${key}`}
                                                    checked={isEnabled}
                                                    onChange={() => handlePeriodToggle(idx)}
                                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-white/10 dark:bg-white/5"
                                                />
                                                <label
                                                    htmlFor={`period-enable-${key}`}
                                                    className="font-bold text-gray-900 dark:text-white cursor-pointer select-none text-base"
                                                >
                                                    {label} Period
                                                </label>
                                                {period?.hasAttendanceSessions && (
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full dark:bg-amber-950/40 dark:text-amber-300">
                                                        <LockClosedIcon className="h-3.5 w-3.5" />
                                                        Active Sessions Recorded
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-gray-400 dark:text-slate-500">Step sequence #{idx + 1}</span>
                                        </div>

                                        {isEnabled && (
                                            <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-gray-100 dark:border-white/10">
                                                <div>
                                                    <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-slate-400">
                                                        Start Date <span className="text-red-500">*</span>
                                                    </label>
                                                    <DatePickerInput
                                                        value={period.period_start}
                                                        min={form.semester_start}
                                                        max={form.semester_end}
                                                        onChange={(e) => handlePeriodChange(idx, "period_start", e.target.value)}
                                                    />
                                                    {fieldErrors[`periods.${idx}.period_start`] && (
                                                        <p className="mt-1 text-xs text-red-500">
                                                            {fieldErrors[`periods.${idx}.period_start`]}
                                                        </p>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-slate-400">
                                                        End Date <span className="text-red-500">*</span>
                                                    </label>
                                                    <DatePickerInput
                                                        value={period.period_end}
                                                        min={period.period_start || form.semester_start}
                                                        max={form.semester_end}
                                                        onChange={(e) => handlePeriodChange(idx, "period_end", e.target.value)}
                                                    />
                                                    {fieldErrors[`periods.${idx}.period_end`] && (
                                                        <p className="mt-1 text-xs text-red-500">
                                                            {fieldErrors[`periods.${idx}.period_end`]}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-between dark:border-white/10">
                            <Button type="button" variant="outline" onClick={handleBack}>
                                Back: Semester Details
                            </Button>
                            <Button type="button" onClick={handleNext}>
                                Next: Review
                            </Button>
                        </div>
                    </section>
                )}

                {/* ================= STEP 3: REVIEW ================= */}
                {currentStep === 3 && (
                    <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm shadow-blue-950/5 dark:border dark:border-white/5 dark:bg-[#12131C]">
                        <div className="flex items-center gap-3 border-b border-gray-100 pb-4 dark:border-white/10">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400">
                                <CheckCircleIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                    Review Semester & Periods
                                </h2>
                                <p className="text-sm text-gray-400 dark:text-slate-400">
                                    Confirm the academic terms and milestone boundaries before saving.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <ReviewGroup title="Semester Overview">
                                <ReviewItem
                                    label="School Year"
                                    value={selectedSchoolYear ? `AY ${selectedSchoolYear.year_range}` : "N/A"}
                                />
                                <ReviewItem label="Academic Term" value={form.term} />
                                <ReviewItem label="Start Date" value={formatDisplayDate(form.semester_start) || "—"} />
                                <ReviewItem label="End Date" value={formatDisplayDate(form.semester_end) || "—"} />
                                <ReviewItem label="Remarks" value={form.remarks || "No remarks provided"} />
                            </ReviewGroup>

                            <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-white/5 dark:bg-[#12131C]">
                                <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-3">
                                    Configured Academic Periods
                                </h3>

                                <div className="overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-white/5 dark:bg-[#161724]">
                                    <table className="w-full text-left text-sm">
                                        <thead className="border-b border-gray-100 bg-gray-50/75 text-xs uppercase text-gray-500 dark:border-white/5 dark:bg-white/5 dark:text-slate-400">
                                            <tr>
                                                <th className="px-4 py-3">Period</th>
                                                <th className="px-4 py-3">Start Date</th>
                                                <th className="px-4 py-3">End Date</th>
                                                <th className="px-4 py-3">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                            {periods.map((p) => {
                                                const label = p.name.charAt(0).toUpperCase() + p.name.slice(1);
                                                const isConfigured = p.enabled && p.period_start && p.period_end;

                                                return (
                                                    <tr key={p.name}>
                                                        <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                                                            {label}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-600 dark:text-slate-300">
                                                            {isConfigured ? formatDisplayDate(p.period_start) : "—"}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-600 dark:text-slate-300">
                                                            {isConfigured ? formatDisplayDate(p.period_end) : "—"}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {isConfigured ? (
                                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full dark:bg-emerald-950/40 dark:text-emerald-300">
                                                                    <CheckCircleIcon className="h-3.5 w-3.5" />
                                                                    Configured
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full dark:bg-white/5 dark:text-slate-400">
                                                                    Follow up later
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end dark:border-white/10">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleBack}
                                disabled={formMutation.isPending}
                            >
                                Back
                            </Button>
                            <Button
                                type="button"
                                onClick={handleSubmit}
                                disabled={formMutation.isPending}
                            >
                                {formMutation.isPending ? "Saving..." : isEdit ? "Update Semester" : "Save Semester"}
                            </Button>
                        </div>
                    </section>
                )}
            </div>
        </>
    );
}
