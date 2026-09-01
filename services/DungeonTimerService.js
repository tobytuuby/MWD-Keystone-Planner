const path = require('path');
const fs = require('fs');
require('dotenv').config();

class DungeonTimerService {
    constructor() {
        this.parentDir = path.join(__dirname, '..', 'data', process.env.EXPANSION || '');
    }

    execute() {
        const expansion = process.env.EXPANSION;
        const season = process.env.SEASON;

        if (!expansion || !season) {
            throw new Error('Missing EXPANSION or SEASON environment variables.');
        }

        const timersPath = path.join(this.parentDir, season, 'timers.json');

        if (!fs.existsSync(timersPath)) {
            return {};
        }

        const timers = require(timersPath);
        for (const [shortName, minutes] of Object.entries(timers)) {
            if (typeof minutes !== 'number' || minutes <= 0) {
                throw new Error(`Invalid timer for dungeon ${shortName}. Expected positive minutes.`);
            }
        }

        return timers;
    }

    attachTimers(dungeons, timers) {
        return dungeons.map((dungeon) => {
            const timerMinutes = timers[dungeon.short_name] ?? null;
            const timerSeconds = timerMinutes === null ? null : timerMinutes * 60;

            return {
                ...dungeon,
                timerMinutes,
                onTimeSeconds: timerSeconds,
                plus2Seconds: timerSeconds === null ? null : timerSeconds * 0.8,
                plus3Seconds: timerSeconds === null ? null : timerSeconds * 0.6,
            };
        });
    }
}

module.exports = {
    DungeonTimerService,
};
