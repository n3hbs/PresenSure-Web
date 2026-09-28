import InstructorForm from "@/Components/Instructors/InstructorForm";
import useFetchData from "@/Hooks/useFetchData";
import { useLocation } from "react-router-dom";

export default function Edit({ userId: propUserId }) {
    const location = useLocation();
    const params = new URLSearchParams(location.search || window.location.search);
    const userId = propUserId || params.get("user_id") || params.get("id");

    const { data: instructorData, isLoading: loadingInstructor } = useFetchData(
        ["instructor-details", userId],
        () => `/instructor/${userId}`,
        { enabled: Boolean(userId) }
    );

    return (
        <InstructorForm
            mode="edit"
            userId={userId}
            initialData={instructorData}
            isLoadingData={loadingInstructor}
        />
    );
}
