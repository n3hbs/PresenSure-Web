import SemesterForm from "@/Components/Semesters/SemesterForm";
import useFetchData from "@/Hooks/useFetchData";

export default function Edit({ semesterId: propSemesterId }) {
    const params =
        typeof window !== "undefined"
            ? new URLSearchParams(window.location.search)
            : new URLSearchParams();
    const semesterId = propSemesterId || params.get("semester_id") || params.get("id");

    const { data: semester, isLoading: loadingSemester } = useFetchData(
        ["semesters", semesterId],
        () => `/v1/semesters/${semesterId}`,
        { enabled: Boolean(semesterId) }
    );

    return (
        <SemesterForm
            mode="edit"
            semesterId={semesterId}
            initialData={semester}
            isLoadingData={loadingSemester}
        />
    );
}
