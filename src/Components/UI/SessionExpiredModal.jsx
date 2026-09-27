import { router } from "@inertiajs/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import Modal from "@/Components/UI/Modal";
import Button from "@/Components/UI/Button";
import queryClient from "@/Services/queryClient";
import { clearAuthSession } from "@/Services/auth";

export default function SessionExpiredModal({ isOpen }) {
    const handleReLogin = () => {
        try {
            clearAuthSession();
            queryClient.clear();
        } catch (e) {
            console.error("Error clearing session storage:", e);
        }

        router.visit("/signin");
    };

    return (
        <Modal
            isOpen={isOpen}
            preventClose={true}
            zIndex="z-90"
            backdropClassName="backdrop-blur-md bg-gray-950/60"
            icon={<ExclamationTriangleIcon className="h-6 w-6" />}
            iconBg="bg-amber-50 text-amber-600"
            title="Session ended"
            description="Your session has ended. Please log in again to continue."
            footer={
                <Button type="button" onClick={handleReLogin}>
                    Log In
                </Button>
            }
        />
    );
}
