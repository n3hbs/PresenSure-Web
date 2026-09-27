import { Link } from "@inertiajs/react";

export default function Breadcrumbs({ crumbs = [], items = [] }) {
    const list = crumbs.length ? crumbs : items;

    return (
        <nav className="text-sm text-gray-500" aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-2">
                {list.map((crumb, index) => (
                    <li key={`${crumb.label}-${index}`} className="flex gap-2">
                        {index > 0 && <span className="text-gray-300">/</span>}

                        {crumb.href ? (
                            <Link
                                href={crumb.href}
                                className="font-medium text-blue-700 transition hover:text-blue-800"
                            >
                                {crumb.label}
                            </Link>
                        ) : (
                            <span>{crumb.label}</span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}
