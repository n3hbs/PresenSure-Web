import api from "@/Services/api";

// Clear legacy mock session storage cache if present
try {
    sessionStorage.removeItem("ps_mock_courses_v1");
    sessionStorage.removeItem("ps_mock_courses_archives_v1");
    sessionStorage.removeItem("ps_mock_course_blocks_archives_v1");
} catch {
    // Ignored in non-browser environments
}

export const courseApi = {
    /**
     * Fetch all active courses
     */
    async getCourses() {
        const res = await api.get("/courses");
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
     * Fetch single course details by ID
     */
    async getCourseById(courseId) {
        const id = Number(courseId);
        const res = await api.get(`/courses/${id}`);
        return res.data?.data || res.data?.course || res.data || null;
    },

    /**
     * Fetch archived courses
     */
    async getArchivedCourses() {
        const res = await api.get("/courses/archives");
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
     * Create a new course
     */
    async createCourse(payload) {
        let savedCourse = null;
        try {
            const res = await api.post("/courses", payload);
            if (res.data) {
                savedCourse = res.data.data || res.data.course || res.data;
            }
        } catch (err) {
            if (err.response && (err.response.status === 422 || err.response.status === 400)) {
                throw err;
            }
            const res = await api.post("/course", {
                subject_code: payload.subject_code,
                name: payload.name,
            });
            if (res.data) {
                savedCourse = res.data.data || res.data.course || res.data;
            }
        }

        const blockCodes =
            Array.isArray(payload.block_codes) && payload.block_codes.length > 0
                ? payload.block_codes
                : payload.initial_block_code
                  ? [payload.initial_block_code]
                  : [];

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
        }

        return savedCourse;
    },

    /**
     * Update an existing course
     */
    async updateCourse(courseId, payload) {
        const id = Number(courseId);
        const res = await api.put(`/courses/${id}`, payload);
        return res.data?.data || res.data?.course || res.data;
    },

    /**
     * Archive (soft-delete) course
     */
    async archiveCourse(courseId) {
        const id = Number(courseId);
        const res = await api.delete(`/courses/${id}`);
        return res.data;
    },

    /**
     * Restore an archived course
     */
    async restoreCourse(courseId) {
        const id = Number(courseId);
        const res = await api.post(`/courses/${id}/restore`, {});
        return res.data;
    },

    /**
     * Add a Course Block to a course
     */
    async createCourseBlock(payload) {
        try {
            const res = await api.post(
                "/course-block",
                {
                    course_id: payload.course_id,
                    semester_id: payload.semester_id,
                    block_code: payload.block_code,
                    instructor_id: payload.instructor_id || null,
                    user_id: payload.instructor_id || null,
                }
            );
            return res.data?.data || res.data?.course_block || res.data;
        } catch (err) {
            if (err.response && (err.response.status === 422 || err.response.status === 400)) {
                throw err;
            }
            if (err.response && err.response.status === 404) {
                const res2 = await api.post(
                    "/course-blocks",
                    {
                        course_id: payload.course_id,
                        semester_id: payload.semester_id,
                        block_code: payload.block_code,
                        instructor_id: payload.instructor_id || null,
                        user_id: payload.instructor_id || null,
                    }
                );
                return res2.data?.data || res2.data?.course_block || res2.data;
            }
            throw err;
        }
    },

    /**
     * Update an existing Course Block
     */
    async updateCourseBlock(blockId, payload) {
        const id = Number(blockId);
        try {
            const res = await api.put(
                `/course-block/${id}`,
                {
                    block_code: payload.block_code,
                    instructor_id: payload.instructor_id || null,
                    user_id: payload.instructor_id || null,
                }
            );
            return res.data?.data || res.data?.course_block || res.data;
        } catch (err) {
            if (err.response && (err.response.status === 422 || err.response.status === 400)) {
                throw err;
            }
            if (err.response && err.response.status === 404) {
                const res2 = await api.put(
                    `/course-blocks/${id}`,
                    {
                        block_code: payload.block_code,
                        instructor_id: payload.instructor_id || null,
                        user_id: payload.instructor_id || null,
                    }
                );
                return res2.data?.data || res2.data?.course_block || res2.data;
            }
            throw err;
        }
    },

    /**
     * Delete / Remove a Course Block
     */
    async deleteCourseBlock(blockId) {
        const id = Number(blockId);
        try {
            const res = await api.delete(`/course-block/${id}`);
            return res.data;
        } catch (err) {
            if (err.response && (err.response.status === 422 || err.response.status === 400)) {
                throw err;
            }
            if (err.response && err.response.status === 404) {
                const res2 = await api.delete(`/course-blocks/${id}`);
                return res2.data;
            }
            throw err;
        }
    },

    /**
     * Archive (soft-delete) a Course Block
     */
    async archiveCourseBlock(blockId) {
        const id = Number(blockId);
        try {
            const res = await api.delete(`/course-block/${id}`);
            return res.data;
        } catch (err) {
            if (err.response && (err.response.status === 422 || err.response.status === 400)) {
                throw err;
            }
            if (err.response && err.response.status === 404) {
                const res2 = await api.delete(`/course-blocks/${id}`);
                return res2.data;
            }
            throw err;
        }
    },

    /**
     * Fetch archived course blocks for a specific course or all courses
     */
    async getArchivedCourseBlocks(courseId = null) {
        const cId = courseId ? Number(courseId) : null;
        const url = cId ? `/courses/${cId}/block-archives` : "/course-blocks/archives";
        const res = await api.get(url);
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
     * Restore an archived Course Block
     */
    async restoreCourseBlock(blockId) {
        const id = Number(blockId);
        try {
            const res = await api.post(`/course-block/${id}/restore`, {});
            return res.data;
        } catch (err) {
            if (err.response && (err.response.status === 422 || err.response.status === 400)) {
                throw err;
            }
            if (err.response && err.response.status === 404) {
                const res2 = await api.post(`/course-blocks/${id}/restore`, {});
                return res2.data;
            }
            throw err;
        }
    },
};

export default courseApi;
