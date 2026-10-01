import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import CourseForm from "@/Components/Courses/CourseForm";
import { courseApi } from "@/Services/courseApi";

export default function Edit({ courseId: propCourseId }) {
    const location = useLocation();
    const params = new URLSearchParams(location.search || window.location.search);
    const courseId = propCourseId || params.get("course_id") || params.get("id");

    const { data: course, isLoading: loadingCourse } = useQuery({
        queryKey: ["course-details", courseId],
        queryFn: () => courseApi.getCourseById(courseId),
        enabled: Boolean(courseId),
    });

    return (
        <CourseForm
            mode="edit"
            courseId={courseId}
            initialData={course}
            isLoadingData={loadingCourse}
        />
    );
}
