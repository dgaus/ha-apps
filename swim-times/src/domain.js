/**
 * Generates the weekly schedule slots.
 */

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Default schedule (fallback if no config provided / the /api/config fetch fails).
// Keys are display indices 0-7; Sunday sits at 7 here so it renders last, matching the
// week_starts_on: monday default. The server is the source of truth when HA config exists.
const DEFAULT_SCHEDULE = {
    "1": { open: "08:00", close: "22:00" },
    "2": { open: "08:00", close: "22:00" },
    "3": { open: "08:00", close: "22:00" },
    "4": { open: "08:00", close: "22:00" },
    "5": { open: "08:00", close: "22:00" },
    "6": { open: "09:00", close: "20:00" },
    "7": { open: "09:00", close: "17:00" }
};
const DEFAULT_SLOT_DURATION = 30;

function parseTime(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return { hours: h, minutes: m };
}

function toMinutes(timeStr) {
    const { hours, minutes } = parseTime(timeStr);
    return hours * 60 + minutes;
}

function fromMinutes(total) {
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Find the schedule entry for a weekday (0-6), honoring Sunday's display index (0 or 7):
// schedule keys are display indices 0-7, and displayIndex % 7 === weekday.
function dayConfigForWeekday(weekday, config) {
    const schedule = config?.schedule || DEFAULT_SCHEDULE;
    const key = Object.keys(schedule).find(k => Number(k) % 7 === weekday);
    return key !== undefined ? schedule[key] : null;
}

// Snap a record to the start of the slot that currently contains its time, so aggregation
// survives slot-duration / open-time changes. Returns "HH:MM" or null when the record falls
// outside the current schedule (day closed, malformed time, or out of open hours).
// Mirrors the open-anchored stepping in generateSlotsForDay so snapped values land exactly on
// rendered slot starts.
function slotStartForRecord(record, config) {
    const dayConfig = dayConfigForWeekday(record.day, config);
    if (!dayConfig || !dayConfig.open || !dayConfig.close) return null;

    const duration = config?.slotDurationMinutes || DEFAULT_SLOT_DURATION;
    const open = toMinutes(dayConfig.open);
    const close = toMinutes(dayConfig.close);
    const t = toMinutes(record.time);

    if (!Number.isFinite(t) || t < open || t >= close) return null;
    return fromMinutes(open + Math.floor((t - open) / duration) * duration);
}

function generateSlotsForDay(dayIndex, config) {
    const schedule = config?.schedule || DEFAULT_SCHEDULE;
    const slotDuration = config?.slotDurationMinutes || DEFAULT_SLOT_DURATION;

    const dayConfig = schedule[String(dayIndex)];
    if (!dayConfig || !dayConfig.open || !dayConfig.close) {
        return []; // Day is closed
    }

    const start = parseTime(dayConfig.open);
    const end = parseTime(dayConfig.close);
    const slots = [];

    let currentH = start.hours;
    let currentM = start.minutes;

    while (true) {
        if (currentH > end.hours || (currentH === end.hours && currentM >= end.minutes)) {
            break;
        }

        const timeString = `${String(currentH).padStart(2, '0')}:${String(currentM).padStart(2, '0')}`;
        slots.push(timeString);

        currentM += slotDuration;
        if (currentM >= 60) {
            currentH += Math.floor(currentM / 60);
            currentM = currentM % 60;
        }
    }

    return slots;
}

export const Domain = {
    getScheduleStructure: (config) => {
        const schedule = config?.schedule || DEFAULT_SCHEDULE;
        const result = {};
        // Iterate the schedule's own display indices (0-7) so Sunday at 7 is honored.
        Object.keys(schedule).forEach(key => {
            const dayConfig = schedule[key];
            if (dayConfig && dayConfig.open && dayConfig.close) {
                result[key] = generateSlotsForDay(Number(key), config);
            }
        });
        return result;
    },

    /**
     * Calculate average occupancy per slot.
     * Each record is snapped to the slot that currently contains its time, so changing the
     * slot duration / open hours just re-buckets existing data instead of orphaning it.
     * Records that fall outside the current schedule are skipped.
     * @param {Array} records
     * @param {Object} [config] schedule config (falls back to defaults)
     */
    calculateStats: (records, config) => {
        // Map: "Weekday-SlotStart" -> { sum, count }
        const stats = {};

        records.forEach(r => {
            const slot = slotStartForRecord(r, config);
            if (slot === null) return; // outside the current schedule

            const key = `${r.day}-${slot}`;
            if (!stats[key]) stats[key] = { sum: 0, count: 0 };
            stats[key].sum += r.rating;
            stats[key].count++;
        });

        return stats;
    },

    /**
     * Filter records belonging to a specific slot (newest first).
     * Matches by the slot a record currently snaps into, not its raw stored time.
     * @param {Array} records
     * @param {number} dayIdx weekday 0-6
     * @param {string} timeStr slot start "HH:MM"
     * @param {Object} [config] schedule config (falls back to defaults)
     */
    filterRecordsBySlot: (records, dayIdx, timeStr, config) => {
        return records
            .filter(r => r.day === dayIdx && slotStartForRecord(r, config) === timeStr)
            .sort((a, b) => b.timestamp - a.timestamp); // Newest first
    }
};
