import api from "@/Services/api";
import { getAuthToken } from "@/Services/auth";

// Initial seed data used if backend course endpoints are still in progress
const DEFAULT_COURSES = [
    {
        course_id: 1,
        subject_code: "IT 101",
        name: "Introduction to Information Technology & Computing",
        description: "Foundational concepts in computing, hardware, software systems, and data processing.",
        created_at: "2026-08-10T08:00:00Z",
        course_blocks: [
            {
                course_block_id: 101,
                course_id: 1,
                semester_id: 1,
                block_code: "BSIT 1-A",
                students_count: 36,
                instructor_name: "Engr. Marco Santos",
                schedules: [
                    { day_of_week: "Monday", start_time: "08:00:00", end_time: "10:00:00", room_name: "CompLab 1" },
                    { day_of_week: "Wednesday", start_time: "08:00:00", end_time: "10:00:00", room_name: "CompLab 1" }
                ],
                semester: { semester_id: 1, term: "1st Semester", school_year: { year_range: "2026-2027" } }
            },
            {
                course_block_id: 102,
                course_id: 1,
                semester_id: 1,
                block_code: "BSIT 1-B",
                students_count: 34,
                instructor_name: "Prof. Elena Cruz",
                schedules: [
                    { day_of_week: "Tuesday", start_time: "10:00:00", end_time: "12:00:00", room_name: "CompLab 2" },
                    { day_of_week: "Thursday", start_time: "10:00:00", end_time: "12:00:00", room_name: "CompLab 2" }
                ],
                semester: { semester_id: 1, term: "1st Semester", school_year: { year_range: "2026-2027" } }
            }
        ]
    },
    {
        course_id: 2,
        subject_code: "CS 202",
        name: "Data Structures and Algorithm Analysis",
        description: "Study of linear and non-linear data structures, algorithm complexity, trees, graphs, and hashing.",
        created_at: "2026-08-12T09:30:00Z",
        course_blocks: [
            {
                course_block_id: 201,
                course_id: 2,
                semester_id: 1,
                block_code: "BSCS 2-A",
                students_count: 30,
                instructor_name: "Dr. Roberto Reyes",
                schedules: [
                    { day_of_week: "Monday", start_time: "13:00:00", end_time: "15:00:00", room_name: "Algorithm Lab" }
                ],
                semester: { semester_id: 1, term: "1st Semester", school_year: { year_range: "2026-2027" } }
            }
        ]
    },
    {
        course_id: 3,
        subject_code: "IT 314",
        name: "Web Systems and Technologies",
        description: "Modern full-stack web application development, reactive components, REST APIs, and authentication.",
        created_at: "2026-08-15T11:00:00Z",
        course_blocks: [
            {
                course_block_id: 301,
                course_id: 3,
                semester_id: 1,
                block_code: "BSIT 3-A",
                students_count: 42,
                instructor_name: "Prof. Christian Diaz",
                schedules: [
                    { day_of_week: "Friday", start_time: "09:00:00", end_time: "12:00:00", room_name: "Web Lab 304" }
                ],
                semester: { semester_id: 1, term: "1st Semester", school_year: { year_range: "2026-2027" } }
            },
            {
                course_block_id: 302,
                course_id: 3,
                semester_id: 1,
                block_code: "BSIT 3-B",
                students_count: 40,
                instructor_name: "Prof. Christian Diaz",
                schedules: [
                    { day_of_week: "Saturday", start_time: "09:00:00", end_time: "12:00:00", room_name: "Web Lab 304" }
                ],
                semester: { semester_id: 1, term: "1st Semester", school_year: { year_range: "2026-2027" } }
            }
        ]
    },
    {
        course_id: 4,
        subject_code: "IS 211",
        name: "Enterprise Architecture & Information Systems",
        description: "Design and modeling of enterprise-wide business information architectures.",
        created_at: "2026-08-18T14:15:00Z",
        course_blocks: []
    }
];

const STORAGE_KEY = "ps_mock_courses_v1";
const ARCHIVES_KEY = "ps_mock_courses_archives_v1";
const BLOCK_ARCHIVES_KEY = "ps_mock_course_blocks_archives_v1";

const getStoredCourses = () => {
    try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
    } catch {
        // Fallback
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_COURSES));
    return DEFAULT_COURSES;
};

const saveStoredCourses = (courses) => {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
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
    return [];
};

const saveStoredArchives = (archives) => {
    try {
        sessionStorage.setItem(ARCHIVES_KEY, JSON.stringify(archives));
    } catch {
        // Ignored
    }
};

const getStoredBlockArchives = () => {
    try {
        const stored = sessionStorage.getItem(BLOCK_ARCHIVES_KEY);
        if (stored) return JSON.parse(stored);
    } catch {
        // Fallback
    }
    return [];
};

const saveStoredBlockArchives = (archives) => {
    try {
        sessionStorage.setItem(BLOCK_ARCHIVES_KEY, JSON.stringify(archives));
    } catch {
        // Ignored
    }
};

export const courseApi = {
    /**
     * Fetch all active courses
     */
    async getCourses() {
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            const res = await api.get("/courses", { headers });
            if (res.data) {
                const data = Array.isArray(res.data.data) ? res.data.data : Array.isArray(res.data) ? res.data : null;
                if (data) return data;
            }
        } catch {
            // Fall through to fallback
        }

        // Return stored fallback while backend is under development
        return getStoredCourses();
    },

    /**
     * Fetch single course details by ID
     */
    async getCourseById(courseId) {
        const id = Number(courseId);
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            const res = await api.get(`/courses/${id}`, { headers });
            if (res.data?.data || res.data?.course) {
                return res.data.data || res.data.course;
            }
        } catch {
            // Fall through to fallback
        }

        const courses = getStoredCourses();
        const found = courses.find((c) => Number(c.course_id) === id);
        if (!found) {
            const archives = getStoredArchives();
            return archives.find((c) => Number(c.course_id) === id) || null;
        }
        return found;
    },

    /**
     * Fetch archived courses
     */
    async getArchivedCourses() {
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            const res = await api.get("/courses/archives", { headers });
            if (res.data) {
                const data = Array.isArray(res.data.data) ? res.data.data : Array.isArray(res.data) ? res.data : null;
                if (data) return data;
            }
        } catch {
            // Fall through to fallback
        }

        return getStoredArchives();
    },

    /**
     * Create a new course
     */
    async createCourse(payload) {
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const blockCodes = Array.isArray(payload.block_codes) && payload.block_codes.length > 0
            ? payload.block_codes
            : payload.initial_block_code
              ? [payload.initial_block_code]
              : [];

        let savedCourse = null;
        try {
            const res = await api.post("/courses", payload, { headers });
            if (res.data) {
                savedCourse = res.data.data || res.data.course || res.data;
            }
        } catch {
            try {
                const res = await api.post("/course", {
                    subject_code: payload.subject_code,
                    name: payload.name,
                }, { headers });
                if (res.data) {
                    savedCourse = res.data.data || res.data.course || res.data;
                }
            } catch {
                // Fallback
            }
        }

        // If backend course was created, create each block via createCourseBlock if not already present
        if (savedCourse && savedCourse.course_id && blockCodes.length > 0 && payload.semester_id) {
            const existingBlocks = (savedCourse.course_blocks || savedCourse.courseBlocks || [])
                .map((b) => (b.block_code || "").toUpperCase());

            for (const bCode of blockCodes) {
                if (!existingBlocks.includes(bCode.toUpperCase())) {
                    try {
                        await this.createCourseBlock({
                            course_id: savedCourse.course_id,
                            semester_id: payload.semester_id,
                            block_code: bCode,
                        });
                    } catch {
                        // ignore if individually already created
                    }
                }
            }
            return savedCourse;
        }

        if (savedCourse) return savedCourse;

        // Local state update (mock fallback)
        const courses = getStoredCourses();
        const courseId = Date.now();
        const newCourse = {
            course_id: courseId,
            subject_code: payload.subject_code,
            name: payload.name,
            description: payload.description || "",
            created_at: new Date().toISOString(),
            course_blocks: blockCodes.map((bCode, idx) => ({
                course_block_id: courseId + idx + 1,
                course_id: courseId,
                semester_id: payload.semester_id || 1,
                block_code: bCode,
                students_count: 0,
                schedules: [],
                semester: {
                    semester_id: payload.semester_id || 1,
                    term: "Current Semester",
                    school_year: { year_range: "2026-2027" },
                },
            })),
        };
        courses.unshift(newCourse);
        saveStoredCourses(courses);
        return newCourse;
    },

    /**
     * Update an existing course
     */
    async updateCourse(courseId, payload) {
        const id = Number(courseId);
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            const res = await api.put(`/courses/${id}`, payload, { headers });
            if (res.data) return res.data;
        } catch {
            // Fallback
        }

        const courses = getStoredCourses();
        const index = courses.findIndex((c) => Number(c.course_id) === id);
        if (index !== -1) {
            courses[index] = {
                ...courses[index],
                subject_code: payload.subject_code ?? courses[index].subject_code,
                name: payload.name ?? courses[index].name,
                description: payload.description ?? courses[index].description,
                updated_at: new Date().toISOString(),
            };
            saveStoredCourses(courses);
            return courses[index];
        }
        return null;
    },

    /**
     * Archive (soft-delete) course
     */
    async archiveCourse(courseId) {
        const id = Number(courseId);
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            await api.delete(`/courses/${id}`, { headers });
        } catch {
            // Fallback
        }

        const courses = getStoredCourses();
        const item = courses.find((c) => Number(c.course_id) === id);
        if (item) {
            const remaining = courses.filter((c) => Number(c.course_id) !== id);
            saveStoredCourses(remaining);
            const archives = getStoredArchives();
            archives.unshift({
                ...item,
                deleted_at: new Date().toISOString(),
            });
            saveStoredArchives(archives);
        }
        return true;
    },

    /**
     * Restore an archived course
     */
    async restoreCourse(courseId) {
        const id = Number(courseId);
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            await api.post(`/courses/${id}/restore`, {}, { headers });
        } catch {
            // Fallback
        }

        const archives = getStoredArchives();
        const item = archives.find((c) => Number(c.course_id) === id);
        if (item) {
            const remainingArchives = archives.filter((c) => Number(c.course_id) !== id);
            saveStoredArchives(remainingArchives);
            const courses = getStoredCourses();
            const { deleted_at: _deleted_at, ...restored } = item;
            courses.unshift(restored);
            saveStoredCourses(courses);
        }
        return true;
    },

    /**
     * Add a Course Block to a course
     */
    async createCourseBlock(payload) {
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            // Try /course-block with instructor_id / user_id
            const res = await api.post(
                "/course-block",
                {
                    course_id: payload.course_id,
                    semester_id: payload.semester_id,
                    block_code: payload.block_code,
                    instructor_id: payload.instructor_id || null,
                    user_id: payload.instructor_id || null,
                },
                { headers }
            );
            if (res.data) return res.data;
        } catch (err) {
            // If backend responded with validation error (e.g. 422 Instructor not found), re-throw so UI displays it
            if (err.response && (err.response.status === 422 || err.response.status === 400)) {
                throw err;
            }
            // If 404, maybe endpoint is under /course-blocks
            if (err.response && err.response.status === 404) {
                try {
                    const res2 = await api.post(
                        "/course-blocks",
                        {
                            course_id: payload.course_id,
                            semester_id: payload.semester_id,
                            block_code: payload.block_code,
                            instructor_id: payload.instructor_id || null,
                            user_id: payload.instructor_id || null,
                        },
                        { headers }
                    );
                    if (res2.data) return res2.data;
                } catch (err2) {
                    if (err2.response && (err2.response.status === 422 || err2.response.status === 400)) {
                        throw err2;
                    }
                }
            }
        }

        const courses = getStoredCourses();
        const course = courses.find((c) => Number(c.course_id) === Number(payload.course_id));
        if (course) {
            const newBlock = {
                course_block_id: Date.now(),
                course_id: course.course_id,
                semester_id: payload.semester_id,
                block_code: payload.block_code,
                students_count: 0,
                instructor_id: payload.instructor_id || null,
                instructor_name: payload.instructor_name || (payload.instructor_id ? `Instructor ID: ${payload.instructor_id}` : "Unassigned"),
                schedules: [],
                semester: payload.semester || {
                    semester_id: payload.semester_id,
                    term: payload.semester_term || "Active Term",
                    school_year: { year_range: payload.school_year || "2026-2027" },
                },
            };
            course.course_blocks = course.course_blocks || [];
            course.course_blocks.push(newBlock);
            saveStoredCourses(courses);
            return newBlock;
        }
        return null;
    },

    /**
     * Update an existing Course Block
     */
    async updateCourseBlock(blockId, payload) {
        const id = Number(blockId);
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            const res = await api.put(
                `/course-block/${id}`,
                {
                    block_code: payload.block_code,
                    instructor_id: payload.instructor_id || null,
                    user_id: payload.instructor_id || null,
                },
                { headers }
            );
            if (res.data) return res.data;
        } catch (err) {
            if (err.response && (err.response.status === 422 || err.response.status === 400)) {
                throw err;
            }
            if (err.response && err.response.status === 404) {
                try {
                    const res2 = await api.put(
                        `/course-blocks/${id}`,
                        {
                            block_code: payload.block_code,
                            instructor_id: payload.instructor_id || null,
                            user_id: payload.instructor_id || null,
                        },
                        { headers }
                    );
                    if (res2.data) return res2.data;
                } catch (err2) {
                    if (err2.response && (err2.response.status === 422 || err2.response.status === 400)) {
                        throw err2;
                    }
                }
            }
        }

        const courses = getStoredCourses();
        for (const course of courses) {
            const blocks = course.course_blocks || course.courseBlocks || [];
            const blkIndex = blocks.findIndex((b) => Number(b.course_block_id) === id);
            if (blkIndex !== -1) {
                blocks[blkIndex] = {
                    ...blocks[blkIndex],
                    block_code: payload.block_code || blocks[blkIndex].block_code,
                    instructor_id: payload.instructor_id !== undefined ? payload.instructor_id : blocks[blkIndex].instructor_id,
                    instructor_name: payload.instructor_name !== undefined ? payload.instructor_name : blocks[blkIndex].instructor_name,
                };
                saveStoredCourses(courses);
                return blocks[blkIndex];
            }
        }
        return null;
    },

    /**
     * Delete / Remove a Course Block
     */
    async deleteCourseBlock(blockId) {
        const id = Number(blockId);
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            const res = await api.delete(`/course-block/${id}`, { headers });
            if (res.data) return res.data;
        } catch (err) {
            if (err.response && (err.response.status === 422 || err.response.status === 400)) {
                throw err;
            }
            if (err.response && err.response.status === 404) {
                try {
                    const res2 = await api.delete(`/course-blocks/${id}`, { headers });
                    if (res2.data) return res2.data;
                } catch (err2) {
                    if (err2.response && (err2.response.status === 422 || err2.response.status === 400)) {
                        throw err2;
                    }
                }
            }
        }

        const courses = getStoredCourses();
        for (const course of courses) {
            if (course.course_blocks) {
                const initialLen = course.course_blocks.length;
                course.course_blocks = course.course_blocks.filter((b) => Number(b.course_block_id) !== id);
                if (course.course_blocks.length !== initialLen) {
                    saveStoredCourses(courses);
                    return true;
                }
            }
        }
        return true;
    },

    /**
     * Archive (soft-delete) a Course Block
     */
    async archiveCourseBlock(blockId) {
        const id = Number(blockId);
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            const res = await api.delete(`/course-block/${id}`, { headers });
            if (res.data) {
                // Succeeded on backend
            }
        } catch (err) {
            if (err.response && (err.response.status === 422 || err.response.status === 400)) {
                throw err;
            }
            if (err.response && err.response.status === 404) {
                try {
                    await api.delete(`/course-blocks/${id}`, { headers });
                } catch (err2) {
                    if (err2.response && (err2.response.status === 422 || err2.response.status === 400)) {
                        throw err2;
                    }
                }
            }
        }

        const courses = getStoredCourses();
        for (const course of courses) {
            const blocks = course.course_blocks || course.courseBlocks || [];
            const blkIndex = blocks.findIndex((b) => Number(b.course_block_id) === id);
            if (blkIndex !== -1) {
                const targetBlock = blocks[blkIndex];
                const schedules = targetBlock.schedules || targetBlock.course_schedules || [];
                const studentCount = Number(targetBlock.students_count || targetBlock.enrolled_count || 0);
                const userBlocks = targetBlock.user_course_blocks || targetBlock.userCourseBlocks || targetBlock.users || [];
                const hasAssignedUsers = userBlocks.length > 0 || Boolean(targetBlock.instructor_id);

                if (schedules.length > 0 || studentCount > 0 || hasAssignedUsers) {
                    const err = new Error("Cannot archive course block with existing schedules or assigned users.");
                    err.response = {
                        data: {
                            message: "Cannot archive course block with existing schedules or assigned users. Please remove them first.",
                        },
                    };
                    throw err;
                }

                const [removedBlock] = blocks.splice(blkIndex, 1);
                saveStoredCourses(courses);

                const blockArchives = getStoredBlockArchives();
                blockArchives.unshift({
                    ...removedBlock,
                    course_id: course.course_id,
                    archived_at: new Date().toISOString(),
                });
                saveStoredBlockArchives(blockArchives);
                return true;
            }
        }
        return true;
    },

    /**
     * Fetch archived course blocks for a specific course or all courses
     */
    async getArchivedCourseBlocks(courseId = null) {
        const cId = courseId ? Number(courseId) : null;
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            const url = cId ? `/courses/${cId}/block-archives` : "/course-blocks/archives";
            const res = await api.get(url, { headers });
            if (res.data) {
                const data = Array.isArray(res.data.data) ? res.data.data : Array.isArray(res.data) ? res.data : null;
                if (data) return data;
            }
        } catch {
            // Fallback
        }

        const blockArchives = getStoredBlockArchives();
        if (cId) {
            return blockArchives.filter((b) => Number(b.course_id) === cId);
        }
        return blockArchives;
    },

    /**
     * Restore an archived Course Block
     */
    async restoreCourseBlock(blockId) {
        const id = Number(blockId);
        const token = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            const res = await api.post(`/course-block/${id}/restore`, {}, { headers });
            if (res.data) return res.data;
        } catch {
            try {
                const res2 = await api.post(`/course-blocks/${id}/restore`, {}, { headers });
                if (res2.data) return res2.data;
            } catch {
                // Fallback
            }
        }

        const blockArchives = getStoredBlockArchives();
        const blkIndex = blockArchives.findIndex((b) => Number(b.course_block_id) === id);
        if (blkIndex !== -1) {
            const [targetBlock] = blockArchives.splice(blkIndex, 1);
            saveStoredBlockArchives(blockArchives);

            const courses = getStoredCourses();
            const course = courses.find((c) => Number(c.course_id) === Number(targetBlock.course_id));
            if (course) {
                course.course_blocks = course.course_blocks || [];
                const { archived_at: _archived_at, ...restored } = targetBlock;
                course.course_blocks.push(restored);
                saveStoredCourses(courses);
            }
            return true;
        }
        return true;
    }
};

export default courseApi;
