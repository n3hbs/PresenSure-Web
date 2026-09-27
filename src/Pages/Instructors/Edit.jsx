import InstructorForm from "@/Components/Instructors/InstructorForm";
import useFetchData from "@/Hooks/useFetchData";

export default function Edit() {
    const params =
        typeof window !== "undefined"
            ? new URLSearchParams(window.location.search)
            : new URLSearchParams();
    const userId = params.get("user_id");

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
