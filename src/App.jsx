import React, { Suspense, lazy, useEffect } from "react";
import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
    useNavigate,
    useParams,
} from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import queryClient from "@/Services/queryClient";
import { setGlobalNavigate } from "@/Utils/inertia-adapter";
import MainLayout from "@/Components/Layout/MainLayout";

// Public pages
const LandingPage = lazy(() => import("@/Pages/LandingPage/Index"));
const SignIn = lazy(() => import("@/Pages/SignIn/Index"));

// Core pages
const Dashboard = lazy(() => import("@/Pages/Dashboard/Index"));
const Roles = lazy(() => import("@/Pages/Roles/Index"));

// Students
const StudentsIndex = lazy(() => import("@/Pages/Students/Index"));
const StudentSingleRegistration = lazy(
    () => import("@/Pages/Students/SingleRegistration"),
);
const StudentBulkRegistration = lazy(
    () => import("@/Pages/Students/BulkRegistration"),
);
const StudentBulkImageUpload = lazy(
    () => import("@/Pages/Students/BulkImageUpload"),
);
const StudentDetails = lazy(() => import("@/Pages/Students/StudentDetails"));
const StudentArchives = lazy(() => import("@/Pages/Students/Archives"));
const StudentEdit = lazy(() => import("@/Pages/Students/Edit"));

// Instructors
const InstructorsIndex = lazy(() => import("@/Pages/Instructors/Index"));
const InstructorSingleRegistration = lazy(
    () => import("@/Pages/Instructors/SingleRegistration"),
);
const InstructorBulkImageUpload = lazy(
    () => import("@/Pages/Instructors/BulkImageUpload"),
);
const InstructorDetails = lazy(
    () => import("@/Pages/Instructors/InstructorDetails"),
);
const InstructorArchives = lazy(() => import("@/Pages/Instructors/Archives"));
const InstructorEdit = lazy(() => import("@/Pages/Instructors/Edit"));

// Semesters
const SemestersIndex = lazy(() => import("@/Pages/Semesters/Index"));
const SemestersSchoolYearDetails = lazy(
    () => import("@/Pages/Semesters/SchoolYearDetails"),
);
const SemestersCreate = lazy(() => import("@/Pages/Semesters/Create"));
const SemestersEdit = lazy(() => import("@/Pages/Semesters/Edit"));
const SemestersArchives = lazy(() => import("@/Pages/Semesters/Archives"));
const SemestersDetails = lazy(
    () => import("@/Pages/Semesters/SemesterDetails"),
);

// Departments
const DepartmentsIndex = lazy(() => import("@/Pages/Departments/Index"));
const DepartmentsCreate = lazy(() => import("@/Pages/Departments/Create"));
const DepartmentsEdit = lazy(() => import("@/Pages/Departments/Edit"));
const DepartmentsArchives = lazy(() => import("@/Pages/Departments/Archives"));
const DepartmentsDetails = lazy(
    () => import("@/Pages/Departments/DepartmentDetails"),
);

// Courses
const CoursesIndex = lazy(() => import("@/Pages/Courses/Index"));
const CoursesCreate = lazy(() => import("@/Pages/Courses/Create"));
const CoursesEdit = lazy(() => import("@/Pages/Courses/Edit"));
const CoursesArchives = lazy(() => import("@/Pages/Courses/Archives"));
const CoursesDetails = lazy(() => import("@/Pages/Courses/CourseDetails"));

// In-Progress Modules
const ProgramsIndex = lazy(() => import("@/Pages/Programs/Index"));
const FacilitiesIndex = lazy(() => import("@/Pages/Facilities/Index"));
const SchedulesIndex = lazy(() => import("@/Pages/Schedules/Index"));
const MySchedulesIndex = lazy(() => import("@/Pages/MySchedules/Index"));
const RecordsIndex = lazy(() => import("@/Pages/Records/Index"));
const AuditLogsIndex = lazy(() => import("@/Pages/AuditLogs/Index"));

// Parameter wrappers
function SemesterEditRoute() {
    const { semester } = useParams();
    return <SemestersEdit semesterId={semester} />;
}

function DepartmentEditRoute() {
    const { department } = useParams();
    return <DepartmentsEdit departmentId={department} />;
}

function CourseEditRoute() {
    const { course } = useParams();
    return <CoursesEdit courseId={course} />;
}

// Global navigator bridge
function NavigationBridge() {
    const navigate = useNavigate();
    useEffect(() => {
        setGlobalNavigate(navigate);
    }, [navigate]);
    return null;
}

import PageLoader from "@/Components/UI/PageLoader";
import { Analytics } from "@vercel/analytics/react";

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <NavigationBridge />
                <Suspense fallback={<PageLoader fullScreen />}>
                    <Routes>
                        {/* Public Pages (Outside MainLayout) */}
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/signin" element={<SignIn />} />
                        <Route
                            path="/signIn"
                            element={<Navigate to="/signin" replace />}
                        />
                        <Route
                            path="/login"
                            element={<Navigate to="/signin" replace />}
                        />

                        {/* Persistent Authenticated Layout (MainLayout stays mounted permanently) */}
                        <Route element={<MainLayout />}>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/roles" element={<Roles />} />

                            {/* Students */}
                            <Route
                                path="/students"
                                element={<StudentsIndex />}
                            />
                            <Route
                                path="/students/single-registration"
                                element={<StudentSingleRegistration />}
                            />
                            <Route
                                path="/students/bulk-registration"
                                element={<StudentBulkRegistration />}
                            />
                            <Route
                                path="/students/bulk-image-upload"
                                element={<StudentBulkImageUpload />}
                            />
                            <Route
                                path="/students/student-details"
                                element={<StudentDetails />}
                            />
                            <Route
                                path="/students/archives"
                                element={<StudentArchives />}
                            />
                            <Route
                                path="/students/edit"
                                element={<StudentEdit />}
                            />

                            {/* Instructors */}
                            <Route
                                path="/instructors"
                                element={<InstructorsIndex />}
                            />
                            <Route
                                path="/instructors/single-registration"
                                element={<InstructorSingleRegistration />}
                            />
                            <Route
                                path="/instructors/bulk-image-upload"
                                element={<InstructorBulkImageUpload />}
                            />
                            <Route
                                path="/instructors/instructor-details"
                                element={<InstructorDetails />}
                            />
                            <Route
                                path="/instructors/archives"
                                element={<InstructorArchives />}
                            />
                            <Route
                                path="/instructors/edit"
                                element={<InstructorEdit />}
                            />

                            {/* Semesters */}
                            <Route
                                path="/semesters"
                                element={<SemestersIndex />}
                            />
                            <Route
                                path="/semesters/school-year-details"
                                element={<SemestersSchoolYearDetails />}
                            />
                            <Route
                                path="/semesters/create"
                                element={<SemestersCreate />}
                            />
                            <Route
                                path="/semesters/edit"
                                element={<SemestersEdit />}
                            />
                            <Route
                                path="/semesters/:semester/edit"
                                element={<SemesterEditRoute />}
                            />
                            <Route
                                path="/semesters/archives"
                                element={<SemestersArchives />}
                            />
                            <Route
                                path="/semesters/semester-details"
                                element={<SemestersDetails />}
                            />

                            {/* Departments */}
                            <Route
                                path="/departments"
                                element={<DepartmentsIndex />}
                            />
                            <Route
                                path="/departments/create"
                                element={<DepartmentsCreate />}
                            />
                            <Route
                                path="/departments/edit"
                                element={<DepartmentsEdit />}
                            />
                            <Route
                                path="/departments/:department/edit"
                                element={<DepartmentEditRoute />}
                            />
                            <Route
                                path="/departments/archives"
                                element={<DepartmentsArchives />}
                            />
                            <Route
                                path="/departments/department-details"
                                element={<DepartmentsDetails />}
                            />

                            {/* Courses */}
                            <Route path="/courses" element={<CoursesIndex />} />
                            <Route
                                path="/courses/create"
                                element={<CoursesCreate />}
                            />
                            <Route
                                path="/courses/edit"
                                element={<CoursesEdit />}
                            />
                            <Route
                                path="/courses/:course/edit"
                                element={<CourseEditRoute />}
                            />
                            <Route
                                path="/courses/archives"
                                element={<CoursesArchives />}
                            />
                            <Route
                                path="/courses/course-details"
                                element={<CoursesDetails />}
                            />

                            {/* In-Progress Modules */}
                            <Route
                                path="/programs"
                                element={<ProgramsIndex />}
                            />
                            <Route
                                path="/facilities"
                                element={<FacilitiesIndex />}
                            />
                            <Route
                                path="/schedules"
                                element={<SchedulesIndex />}
                            />
                            <Route
                                path="/my-schedules"
                                element={<MySchedulesIndex />}
                            />
                            <Route path="/records" element={<RecordsIndex />} />
                            <Route
                                path="/audit-logs"
                                element={<AuditLogsIndex />}
                            />
                        </Route>

                        {/* Wildcard */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Suspense>
            </BrowserRouter>
            <Analytics />
        </QueryClientProvider>
    );
}
