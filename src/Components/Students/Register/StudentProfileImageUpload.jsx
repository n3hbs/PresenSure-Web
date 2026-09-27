import { PhotoIcon } from "@heroicons/react/24/outline";

export default function StudentProfileImageUpload({
    image,
    imagePreview,
    error,
    onImageChange,
    onRemoveImage,
}) {
    return (
        <aside className="h-fit rounded-xl bg-white p-5 shadow-sm shadow-blue-950/5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">
                Profile Image
            </h2>

            <label
                htmlFor="student-image"
                className="flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-blue-200 bg-blue-50/50 text-blue-700 transition hover:border-blue-400 hover:bg-blue-50"
            >
                {imagePreview ? (
                    <img
                        src={imagePreview}
                        alt="Student preview"
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex flex-col items-center gap-2 text-center">
                        <PhotoIcon className="h-10 w-10" />
                        <span className="text-sm font-semibold">
                            Upload image
                        </span>
                    </div>
                )}
                <input
                    id="student-image"
                    type="file"
                    accept="image/*"
                    onChange={onImageChange}
                    className="hidden"
                />
            </label>

            {image && (
                <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium text-gray-600">
                        {image.name}
                    </p>
                    <button
                        type="button"
                        onClick={onRemoveImage}
                        className="text-sm font-semibold text-red-600 hover:text-red-700"
                    >
                        Remove
                    </button>
                </div>
            )}
            {error}
        </aside>
    );
}
