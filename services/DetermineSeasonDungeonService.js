const path = require('path');
const fs = require('fs');
require('dotenv').config();

class DetermineSeasonDungeonService {
    constructor() {
        const baseDir = path.join(__dirname, '..');
        this.parentDir = path.join(baseDir, 'data/' + process.env.EXPANSION);
    }

    execute() {
        const expansion = process.env.EXPANSION;
        const season = process.env.SEASON;

        if (!expansion || !season) {
            throw new Error('Missing EXPANSION or SEASON environment variables.');
        }

        const seasonDir = path.join(this.parentDir, season);
        const dungeonsPath = path.join(seasonDir, 'dungeons.json');

        if (!fs.existsSync(dungeonsPath)) {
            throw new Error(`Dungeon data not found for EXPANSION=${expansion}, SEASON=${season}.`);
        }

        const dungeons = require(dungeonsPath);

        return dungeons;
    }
}

module.exports = {
    DetermineSeasonDungeonService,
};
