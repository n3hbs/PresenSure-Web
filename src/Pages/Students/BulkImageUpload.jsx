import MainLayout from "@/Components/Layout/MainLayout";
import BulkImageUploadPage from "@/Components/BulkUpload/BulkImageUploadPage";

export default function BulkImageUpload() {
    return <BulkImageUploadPage type="student" />;
}

BulkImageUpload.layout = (page) => <MainLayout>{page}</MainLayout>;
