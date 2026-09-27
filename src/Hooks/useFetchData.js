import { useQuery } from "@tanstack/react-query";
import api from "@/Services/api";
import { getAuthToken } from "@/Services/auth";

/**
 * Lightweight, reusable TanStack Query hook that eliminates repetitive
 * token-checking and boilerplate across components.
 *
 * @param {Array|string} queryKey - TanStack query key
 * @param {string|Function} url - API endpoint to GET
 * @param {Object} [options={}] - Additional useQuery options
 */
export function useFetchData(queryKey, url, options = {}) {
    const hasToken = Boolean(getAuthToken());
    const { enabled = true, ...restOptions } = options;

    return useQuery({
        queryKey: Array.isArray(queryKey) ? queryKey : [queryKey],
        enabled: hasToken && Boolean(typeof enabled === "function" ? enabled() : enabled),
        queryFn: async () => {
            const endpoint = typeof url === "function" ? url() : url;
            const res = await api.get(endpoint);
            return res.data?.data ?? res.data ?? [];
        },
        ...restOptions,
    });
}

export default useFetchData;
