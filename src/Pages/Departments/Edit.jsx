import DepartmentForm from "@/Components/Departments/DepartmentForm";
import useFetchData from "@/Hooks/useFetchData";

export default function Edit() {
    const params =
        typeof window !== "undefined"
            ? new URLSearchParams(window.location.search)
            : new URLSearchParams();
    const departmentId = params.get("department_id") || params.get("id");

    const { data: department, isLoading: loadingDepartment } = useFetchData(
        ["department-details", departmentId],
        () => `/v1/departments/${departmentId}`,
        { enabled: Boolean(departmentId) }
    );

    return (
        <DepartmentForm
            mode="edit"
            departmentId={departmentId}
            initialData={department}
            isLoadingData={loadingDepartment}
        />
    );
}
