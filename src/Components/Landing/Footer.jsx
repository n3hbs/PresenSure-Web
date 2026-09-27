import Logo from "@/assets/images/whiteLogo.webp";

const LINKS = {
    Navigation: [
        { name: "Home", href: "#home" },
        { name: "Features", href: "#features" },
        { name: "How It Works", href: "#how-it-works" },
    ],
    Resources: [
        {
            name: "GitHub",
            href: "https://github.com/n3hbs/PresenSure-New.git",
        },
    ],
    Contact: [
        {
            label: "Email",
            value: "bhnsgrl20@gmail.com",
        },
        {
            label: "Facebook",
            value: "Bhencyris John Sagaral",
        },
    ],
};

export default function Footer() {
    return (
        <footer className="bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 transition-colors duration-300">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
                    {/* Brand */}
                    <div className="col-span-2 md:col-span-2 flex flex-col gap-4">
                        <a
                            href="/"
                            className="flex items-center gap-2 font-bold text-gray-900 dark:text-white transition-colors duration-300"
                        >
                            <span className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center overflow-hidden">
                                <img
                                    src={Logo}
                                    alt="PresenSure Logo"
                                    className="w-8 h-8 object-contain"
                                />
                            </span>

                            <span>
                                Presen
                                <span className="text-blue-600">Sure</span>
                            </span>
                        </a>

                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed transition-colors duration-300">
                            A classroom attendance system powered by Bluetooth
                            Low Energy (BLE) and facial recognition.
                        </p>
                    </div>

                    {/* Links */}
                    {Object.entries(LINKS).map(([group, items]) => (
                        <div key={group}>
                            <p className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4 transition-colors duration-300">
                                {group}
                            </p>

                            <ul className="space-y-2">
                                {items.map((item) => (
                                    <li key={item.name ?? item.label}>
                                        {"href" in item ? (
                                            <a
                                                href={item.href}
                                                className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-300"
                                            >
                                                {item.name}
                                            </a>
                                        ) : (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300">
                                                <span className="font-medium text-gray-700 dark:text-gray-300 transition-colors duration-300">
                                                    {item.label}:
                                                </span>{" "}
                                                {item.value}
                                            </p>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </footer>
    );
}
