import api from "@/Services/api";
import { getAuthToken } from "@/Services/auth";

// Initial seed data if backend facilities endpoints are still in progress
const DEFAULT_BUILDINGS = [
    {
        building_id: 1,
        code: "MAIN",
        name: "Main Academic Building",
        rooms_count: 4,
        created_at: "2026-08-01T08:00:00Z",
        rooms: [
            { room_id: 101, building_id: 1, name: "Room 101 (Lecture)", floor_no: 1, capacity: 45, status: "Active", schedules_count: 3 },
            { room_id: 102, building_id: 1, name: "Room 102 (Lecture)", floor_no: 1, capacity: 40, status: "Active", schedules_count: 2 },
            { room_id: 201, building_id: 1, name: "Room 201 (Smart Class)", floor_no: 2, capacity: 35, status: "Active", schedules_count: 4 },
            { room_id: 202, building_id: 1, name: "Audio Visual Room (AVR)", floor_no: 2, capacity: 80, status: "Active", schedules_count: 1 },
        ],
    },
    {
        building_id: 2,
        code: "ITE-BLDG",
        name: "IT & Engineering Complex",
        rooms_count: 3,
        created_at: "2026-08-05T09:00:00Z",
        rooms: [
            { room_id: 2010, building_id: 2, name: "Computer Laboratory 1", floor_no: 1, capacity: 40, status: "Active", schedules_count: 5 },
            { room_id: 2020, building_id: 2, name: "Computer Laboratory 2", floor_no: 1, capacity: 40, status: "Active", schedules_count: 4 },
            { room_id: 2030, building_id: 2, name: "Hardware & Robotics Lab", floor_no: 2, capacity: 30, status: "Active", schedules_count: 2 },
        ],
    },
    {
        building_id: 3,
        code: "SCI-LAB",
        name: "Natural Sciences Center",
        rooms_count: 2,
        created_at: "2026-08-10T10:30:00Z",
        rooms: [
            { room_id: 3010, building_id: 3, name: "Chemistry Laboratory", floor_no: 1, capacity: 35, status: "Active", schedules_count: 1 },
            { room_id: 3020, building_id: 3, name: "Physics & Circuitry Lab", floor_no: 2, capacity: 35, status: "Active", schedules_count: 2 },
        ],
    },
];

const STORAGE_KEY = "ps_mock_facilities_v1";
const ARCHIVES_KEY = "ps_mock_facilities_archives_v1";

const getStoredBuildings = () => {
    try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
    } catch {
        // Fallback
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_BUILDINGS));
    return DEFAULT_BUILDINGS;
};

const saveStoredBuildings = (buildings) => {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(buildings));
    } catch {
        // Ignored
    }
};

const getStoredArchives = () => {
    try {
        const stored = sessionStorage.getItem(ARCHIVES_KEY);
        if (stored) return JSON.parse(stored);
    } catch {
        // Fallback
    }
    return { buildings: [], rooms: [] };
};

const saveStoredArchives = (archives) => {
    try {
        sessionStorage.setItem(ARCHIVES_KEY, JSON.stringify(archives));
    } catch {
        // Ignored
    }
};

export const facilityApi = {
    /**
     * Fetch all active buildings
     */
    async getBuildings() {
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            const res = await api.get("/buildings", { headers });
            if (res.data) {
                const data = Array.isArray(res.data.data) ? res.data.data : Array.isArray(res.data) ? res.data : null;
                if (data) return data;
            }
        } catch {
            // Fall through to mock
        }

        return getStoredBuildings();
    },

    /**
     * Fetch single building details by ID
     */
    async getBuildingById(buildingId) {
        const id = Number(buildingId);
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            const res = await api.get(`/buildings/${id}`, { headers });
            if (res.data?.data || res.data?.building) {
                return res.data.data || res.data.building;
            }
        } catch {
            // Fall through to local
        }

        const buildings = getStoredBuildings();
        return buildings.find((b) => Number(b.building_id) === id) || null;
    },

    /**
     * Create a new building
     */
    async createBuilding(payload) {
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            const res = await api.post("/buildings", payload, { headers });
            if (res.data) return res.data;
        } catch (err) {
            if (err.response && (err.response.status === 422 || err.response.status === 400)) {
                throw err;
            }
            try {
                const res = await api.post("/building", payload, { headers });
                if (res.data) return res.data;
            } catch (err2) {
                if (err2.response && (err2.response.status === 422 || err2.response.status === 400)) {
                    throw err2;
                }
            }
        }

        // Local storage update
        const buildings = getStoredBuildings();
        const newBuilding = {
            building_id: Date.now(),
            code: payload.code.toUpperCase().trim(),
            name: payload.name.trim(),
            rooms_count: Array.isArray(payload.rooms) ? payload.rooms.length : 0,
            created_at: new Date().toISOString(),
            rooms: Array.isArray(payload.rooms)
                ? payload.rooms.map((r, idx) => ({
                      room_id: Date.now() + idx + 1,
                      building_id: Date.now(),
                      name: r.name,
                      floor_no: Number(r.floor_no) || 1,
                      capacity: Number(r.capacity) || 40,
                      status: r.status || "Active",
                      schedules_count: 0,
                  }))
                : [],
        };
        buildings.unshift(newBuilding);
        saveStoredBuildings(buildings);
        return newBuilding;
    },

    /**
     * Update an existing building
     */
    async updateBuilding(buildingId, payload) {
        const id = Number(buildingId);
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            const res = await api.put(`/buildings/${id}`, payload, { headers });
            if (res.data) return res.data;
        } catch (err) {
            if (err.response && (err.response.status === 422 || err.response.status === 400)) {
                throw err;
            }
        }

        const buildings = getStoredBuildings();
        const index = buildings.findIndex((b) => Number(b.building_id) === id);
        if (index !== -1) {
            buildings[index] = {
                ...buildings[index],
                code: payload.code ?? buildings[index].code,
                name: payload.name ?? buildings[index].name,
                updated_at: new Date().toISOString(),
            };
            saveStoredBuildings(buildings);
            return buildings[index];
        }
        return null;
    },

    /**
     * Archive building
     */
    async archiveBuilding(buildingId) {
        const id = Number(buildingId);
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            await api.delete(`/buildings/${id}`, { headers });
        } catch {
            // Fall through to local
        }

        const buildings = getStoredBuildings();
        const item = buildings.find((b) => Number(b.building_id) === id);
        if (item) {
            const remaining = buildings.filter((b) => Number(b.building_id) !== id);
            saveStoredBuildings(remaining);
            const archives = getStoredArchives();
            archives.buildings.unshift({
                ...item,
                deleted_at: new Date().toISOString(),
            });
            saveStoredArchives(archives);
        }
        return true;
    },

    /**
     * Fetch all rooms with optional filtering
     */
    async getRooms(filters = {}) {
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            const res = await api.get("/rooms", { headers, params: filters });
            if (res.data) {
                const data = Array.isArray(res.data.data) ? res.data.data : Array.isArray(res.data) ? res.data : null;
                if (data) return data;
            }
        } catch {
            // Fall through to local
        }

        // Return flattened rooms from stored buildings
        const buildings = getStoredBuildings();
        const allRooms = [];
        buildings.forEach((b) => {
            (b.rooms || []).forEach((r) => {
                allRooms.push({
                    ...r,
                    building: {
                        building_id: b.building_id,
                        code: b.code,
                        name: b.name,
                    },
                });
            });
        });
        return allRooms;
    },

    /**
     * Create a new room
     */
    async createRoom(payload) {
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            const res = await api.post("/rooms", payload, { headers });
            if (res.data) return res.data;
        } catch (err) {
            if (err.response && (err.response.status === 422 || err.response.status === 400)) {
                throw err;
            }
            try {
                const res = await api.post("/room", payload, { headers });
                if (res.data) return res.data;
            } catch (err2) {
                if (err2.response && (err2.response.status === 422 || err2.response.status === 400)) {
                    throw err2;
                }
            }
        }

        // Local storage update
        const buildings = getStoredBuildings();
        const targetBuilding = buildings.find(
            (b) => Number(b.building_id) === Number(payload.building_id)
        );
        const newRoom = {
            room_id: Date.now(),
            building_id: Number(payload.building_id),
            name: payload.name.trim(),
            floor_no: Number(payload.floor_no) || 1,
            capacity: Number(payload.capacity) || 40,
            status: payload.status || "Active",
            schedules_count: 0,
            created_at: new Date().toISOString(),
        };

        if (targetBuilding) {
            targetBuilding.rooms = targetBuilding.rooms || [];
            targetBuilding.rooms.push(newRoom);
            targetBuilding.rooms_count = targetBuilding.rooms.length;
            saveStoredBuildings(buildings);
        }

        return newRoom;
    },

    /**
     * Fetch single room details by ID, optionally filtered by semester
     */
    async getRoomById(roomId, semesterId = null) {
        const id = Number(roomId);
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const params = semesterId ? { semester_id: semesterId } : {};

        try {
            const res = await api.get(`/rooms/${id}`, { headers, params });
            if (res.data?.data || res.data?.room) {
                return res.data.data || res.data.room;
            }
        } catch {
            // Fall through to local
        }

        const buildings = getStoredBuildings();
        for (const b of buildings) {
            const found = (b.rooms || []).find((r) => Number(r.room_id) === id);
            if (found) {
                return {
                    ...found,
                    building: {
                        building_id: b.building_id,
                        code: b.code,
                        name: b.name,
                    },
                };
            }
        }
        return null;
    },

    /**
     * Update room details
     */
    async updateRoom(roomId, payload) {
        const id = Number(roomId);
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            const res = await api.put(`/rooms/${id}`, payload, { headers });
            if (res.data) return res.data;
        } catch (err) {
            if (err.response && (err.response.status === 422 || err.response.status === 400)) {
                throw err;
            }
        }

        const buildings = getStoredBuildings();
        for (const b of buildings) {
            const idx = (b.rooms || []).findIndex((r) => Number(r.room_id) === id);
            if (idx !== -1) {
                b.rooms[idx] = {
                    ...b.rooms[idx],
                    ...payload,
                    updated_at: new Date().toISOString(),
                };
                saveStoredBuildings(buildings);
                return b.rooms[idx];
            }
        }
        return null;
    },

    /**
     * Archive room
     */
    async archiveRoom(roomId) {
        const id = Number(roomId);
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            await api.delete(`/rooms/${id}`, { headers });
        } catch {
            // Fall through to local
        }

        const buildings = getStoredBuildings();
        for (const b of buildings) {
            const idx = (b.rooms || []).findIndex((r) => Number(r.room_id) === id);
            if (idx !== -1) {
                const [removed] = b.rooms.splice(idx, 1);
                b.rooms_count = b.rooms.length;
                saveStoredBuildings(buildings);
                const archives = getStoredArchives();
                archives.rooms.unshift({
                    ...removed,
                    deleted_at: new Date().toISOString(),
                });
                saveStoredArchives(archives);
                return true;
            }
        }
        return true;
    },

    /**
     * Fetch programs (combining /programs and /departments)
     */
    async getPrograms() {
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            const res = await api.get("/programs", { headers });
            if (res.data) {
                const data = Array.isArray(res.data.data) ? res.data.data : Array.isArray(res.data) ? res.data : null;
                if (data && data.length > 0) return data;
            }
        } catch {
            // Fall through to departments
        }

        try {
            const res = await api.get("/departments", { headers });
            const depts = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
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
            if (result.length > 0) return result;
        } catch {
            // Fallback
        }

        return [
            { program_id: 1, program_code: "BSIT", program_name: "Bachelor of Science in Information Technology", program_years: 4, department_name: "College of Computer Studies", students_count: 142 },
            { program_id: 2, program_code: "BSCS", program_name: "Bachelor of Science in Computer Science", program_years: 4, department_name: "College of Computer Studies", students_count: 98 },
            { program_id: 3, program_code: "BSBA", program_name: "Bachelor of Science in Business Administration", program_years: 4, department_name: "College of Business Management", students_count: 120 },
            { program_id: 4, program_code: "BSED", program_name: "Bachelor of Secondary Education", program_years: 4, department_name: "College of Teacher Education", students_count: 85 },
        ];
    },
};

export default facilityApi;
