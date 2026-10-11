/**
 * Formats an ISO date string or Date object into human-readable format:
 * "Month Day, Year" (e.g. "Sep 26, 2026").
 *
 * @param {string|Date} dateStr
 * @returns {string}
 */
export function formatDate(dateStr) {
    if (!dateStr) return "—";
    try {
        if (typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
            const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
            const date = new Date(y, m - 1, d);
            return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        }
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
        return dateStr;
    }
}

export const DAY_ORDER = {
    M: 1,
    T: 2,
    W: 3,
    Th: 4,
    F: 5,
    Sa: 6,
    Su: 7,
};

export function shortenDay(dayStr) {
    if (!dayStr || typeof dayStr !== "string") return "";
    const clean = dayStr.trim().toLowerCase();
    if (clean === "m" || clean.startsWith("mon")) return "M";
    if (clean === "th" || clean.startsWith("thu")) return "Th";
    if (clean === "t" || clean.startsWith("tu")) return "T";
    if (clean === "w" || clean.startsWith("wed")) return "W";
    if (clean === "f" || clean.startsWith("fri")) return "F";
    if (clean === "sa" || clean.startsWith("sat")) return "Sa";
    if (clean === "su" || clean.startsWith("sun")) return "Su";
    return dayStr.trim();
}

export function formatDaysShortcut(raw) {
    if (!raw) return "TBA";
    let list;
    if (Array.isArray(raw)) {
        list = raw.map((item) =>
            typeof item === "object" ? item?.day || item?.name || "" : item,
        );
    } else if (typeof raw === "string") {
        const trimmed = raw.trim();
        if (/[,/]/.test(trimmed)) {
            list = trimmed.split(/[,/]/);
        } else if (/\s+/.test(trimmed)) {
            list = trimmed.split(/\s+/);
        } else {
            list = [trimmed];
        }
    } else {
        list = [String(raw)];
    }
    const shortcuts = list.map((s) => shortenDay(String(s))).filter(Boolean);
    if (shortcuts.length === 0) return "TBA";

    const uniqueShortcuts = Array.from(new Set(shortcuts));
    uniqueShortcuts.sort((a, b) => (DAY_ORDER[a] || 99) - (DAY_ORDER[b] || 99));

    return uniqueShortcuts.join("");
}

export default formatDate;

