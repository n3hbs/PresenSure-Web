import MainLayout from "@/Components/Layout/MainLayout";
import BulkImageUploadPage from "@/Components/BulkUpload/BulkImageUploadPage";

export default function BulkImageUpload() {
    return <BulkImageUploadPage type="instructor" />;
}

BulkImageUpload.layout = (page) => <MainLayout>{page}</MainLayout>;
