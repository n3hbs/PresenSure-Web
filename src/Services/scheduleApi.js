import api from "@/Services/api";

export const scheduleApi = {
    /**
     * Fetch active course blocks with linked schedules, course, instructor, and student counts
     */
    async getCourseBlocks(params = {}) {
        try {
            const res = await api.get("/course-blocks", { params });
            if (res.data) {
                return Array.isArray(res.data.data)
                    ? res.data.data
                    : Array.isArray(res.data)
                      ? res.data
                      : [];
            }
            return [];
        } catch (err) {
            // Fallback: If /course-blocks route is unavailable, aggregate through courses
            if (err.response && err.response.status === 404) {
                try {
                    const coursesRes = await api.get("/courses");
                    const courses = Array.isArray(coursesRes.data?.data)
                        ? coursesRes.data.data
                        : Array.isArray(coursesRes.data)
                          ? coursesRes.data
                          : [];

                    const aggregatedBlocks = [];
                    for (const course of courses) {
                        try {
                            const detailRes = await api.get(`/courses/${course.course_id}`);
                            const detail = detailRes.data?.data || detailRes.data?.course || detailRes.data;
                            const blocks = detail?.course_blocks || detail?.courseBlocks || [];
                            blocks.forEach((blk) => {
                                aggregatedBlocks.push({
                                    ...blk,
                                    course: blk.course || {
                                        course_id: course.course_id,
                                        subject_code: course.subject_code,
                                        name: course.name,
                                        description: course.description,
                                    },
                                });
                            });
                        } catch {
                            // ignore individual course fetch failure
                        }
                    }
                    return aggregatedBlocks;
                } catch {
                    return [];
                }
            }
            throw err;
        }
    },

    /**
     * Create a new schedule (and associates/creates course block if needed)
     */
    async createSchedule(payload) {
        const res = await api.post("/schedule", {
            course_id: Number(payload.course_id),
            room_id: Number(payload.room_id),
            semester_id: Number(payload.semester_id),
            block_code: String(payload.block_code).trim().toUpperCase(),
            schedule_type: payload.schedule_type || "lecture",
            start_time: payload.start_time,
            end_time: payload.end_time,
            days: Array.isArray(payload.days) ? payload.days : [payload.days],
            user_ids: Array.isArray(payload.user_ids) ? payload.user_ids : [],
        });
        return res.data;
    },

    /**
     * Delete an existing class schedule
     */
    async deleteSchedule(scheduleId) {
        const id = Number(scheduleId);
        const res = await api.delete(`/schedule/${id}`);
        return res.data;
    },

    /**
     * Retrieve students enrolled in a schedule
     */
    async getScheduleStudents(scheduleId) {
        const id = Number(scheduleId);
        const res = await api.get(`/schedule/${id}/students`);
        return res.data?.data || res.data;
    },

    /**
     * Retrieve personal schedule for a specific user in the active semester
     */
    async getUserCourseSchedule(userId) {
        const res = await api.get(`/user/${userId}/course-schedules`);
        return res.data?.data || res.data || [];
    },

    /**
     * Retrieve single course block with details by ID
     */
    async getCourseBlockById(blockId) {
        const id = Number(blockId);
        try {
            const res = await api.get(`/course-blocks/${id}`);
            return res.data?.data || res.data;
        } catch (err) {
            if (err.response && err.response.status === 404) {
                const all = await this.getCourseBlocks();
                return all.find((b) => Number(b.course_block_id) === id) || null;
            }
            throw err;
        }
    },
};

export default scheduleApi;
