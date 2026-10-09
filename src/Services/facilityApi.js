import api from "@/Services/api";

// Clear legacy mock session storage cache if present
try {
    sessionStorage.removeItem("ps_mock_facilities_v1");
    sessionStorage.removeItem("ps_mock_facilities_archives_v1");
} catch {
    // Ignored in non-browser environments
}

export const facilityApi = {
    /**
     * Fetch all active buildings
     */
    async getBuildings() {
        const res = await api.get("/buildings");
        if (res.data) {
            return Array.isArray(res.data.data)
                ? res.data.data
                : Array.isArray(res.data)
                  ? res.data
                  : [];
        }
        return [];
    },

    /**
     * Fetch single building details by ID
     */
    async getBuildingById(buildingId) {
        const id = Number(buildingId);
        const res = await api.get(`/buildings/${id}`);
        return res.data?.data || res.data?.building || res.data || null;
    },

    /**
     * Create a new building
     */
    async createBuilding(payload) {
        try {
            const res = await api.post("/buildings", payload);
            if (res.data) return res.data?.data || res.data?.building || res.data;
        } catch (err) {
            if (err.response && (err.response.status === 422 || err.response.status === 400)) {
                throw err;
            }
            const res = await api.post("/building", payload);
            if (res.data) return res.data?.data || res.data?.building || res.data;
        }
    },

    /**
     * Update an existing building
     */
    async updateBuilding(buildingId, payload) {
        const id = Number(buildingId);
        const res = await api.put(`/buildings/${id}`, payload);
        return res.data?.data || res.data?.building || res.data;
    },

    /**
     * Archive building
     */
    async archiveBuilding(buildingId) {
        const id = Number(buildingId);
        const res = await api.delete(`/buildings/${id}`);
        return res.data;
    },

    /**
     * Fetch archived buildings
     */
    async getArchivedBuildings() {
        const res = await api.get("/buildings/archives");
        if (res.data) {
            return Array.isArray(res.data.data)
                ? res.data.data
                : Array.isArray(res.data)
                  ? res.data
                  : [];
        }
        return [];
    },

    /**
     * Restore archived building
     */
    async restoreBuilding(buildingId) {
        const id = Number(buildingId);
        const res = await api.post(`/buildings/${id}/restore`, {});
        return res.data;
    },

    /**
     * Fetch all rooms with optional filtering
     */
    async getRooms(filters = {}) {
        const res = await api.get("/rooms", { params: filters });
        if (res.data) {
            return Array.isArray(res.data.data)
                ? res.data.data
                : Array.isArray(res.data)
                  ? res.data
                  : [];
        }
        return [];
    },

    /**
     * Create a new room
     */
    async createRoom(payload) {
        try {
            const res = await api.post("/rooms", payload);
            if (res.data) return res.data?.data || res.data?.room || res.data;
        } catch (err) {
            if (err.response && (err.response.status === 422 || err.response.status === 400)) {
                throw err;
            }
            const res = await api.post("/room", payload);
            if (res.data) return res.data?.data || res.data?.room || res.data;
        }
    },

    /**
     * Fetch single room details by ID, optionally filtered by semester
     */
    async getRoomById(roomId, semesterId = null) {
        const id = Number(roomId);
        const params = semesterId ? { semester_id: semesterId } : {};
        const res = await api.get(`/rooms/${id}`, { params });
        return res.data?.data || res.data?.room || res.data || null;
    },

    /**
     * Update room details
     */
    async updateRoom(roomId, payload) {
        const id = Number(roomId);
        const res = await api.put(`/rooms/${id}`, payload);
        return res.data?.data || res.data?.room || res.data;
    },

    /**
     * Archive room
     */
    async archiveRoom(roomId) {
        const id = Number(roomId);
        const res = await api.delete(`/rooms/${id}`);
        return res.data;
    },

    /**
     * Fetch archived rooms with optional building filtering
     */
    async getArchivedRooms(buildingId = null) {
        const params = buildingId ? { building_id: buildingId } : {};
        const res = await api.get("/rooms/archives", { params });
        if (res.data) {
            return Array.isArray(res.data.data)
                ? res.data.data
                : Array.isArray(res.data)
                  ? res.data
                  : [];
        }
        return [];
    },

    /**
     * Restore archived room
     */
    async restoreRoom(roomId) {
        const id = Number(roomId);
        const res = await api.post(`/rooms/${id}/restore`, {});
        return res.data;
    },

    /**
     * Fetch programs (combining /programs and /departments)
     */
    async getPrograms() {
        try {
            const res = await api.get("/programs");
            if (res.data) {
                const data = Array.isArray(res.data.data)
                    ? res.data.data
                    : Array.isArray(res.data)
                      ? res.data
                      : null;
                if (data && data.length > 0) return data;
            }
        } catch {
            // Fall through to departments
        }

        try {
            const res = await api.get("/departments");
            const depts = Array.isArray(res.data?.data)
                ? res.data.data
                : Array.isArray(res.data)
                  ? res.data
                  : [];
            const result = [];
            depts.forEach((dept) => {
                (dept.programs || []).forEach((prog) => {
                    result.push({
                        ...prog,
                        department_id: dept.department_id,
                        department_code: dept.department_code,
                        department_name: dept.department_name,
                    });
                });
            });
            return result;
        } catch {
            return [];
        }
    },
};

export default facilityApi;
