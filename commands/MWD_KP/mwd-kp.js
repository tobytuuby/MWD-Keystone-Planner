const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { default: axios } = require('axios');
const {
    buildTableFromJson,
    getHelpJson,
    sendStructuredResponseToUser,
    sortDungeonsBy,
    sendStructuredResponseToUserViaSlashCommand,
    generateMythicImage
} = require('../../reusables/functions');
const { DungeonService } = require('../../services/DungeonService');
const { DungeonScoreService } = require('../../services/DungeonScoreService');
const { DetermineSeasonDungeonService } = require('../../services/DetermineSeasonDungeonService');

async function getDungeonData(args) {
    const res = await requestData(args);

    const dungeons = new DetermineSeasonDungeonService().execute();

    if (args.isSimulateCommand) {
        return calculateSimulatedLevel(res.data, args.simulateLevel, dungeons);
    }

    return calculateMinimumImprovements(res.data, dungeons);
}

function calculateSimulatedLevel(data, levelToSimulate, seasonDungeons) {
    const dungeonService = new DungeonService(seasonDungeons);
    const dungeonScoreService = new DungeonScoreService();
    const bestRuns = Array.isArray(data.mythic_plus_best_runs) ? data.mythic_plus_best_runs : [];
    const dungeons = dungeonService.buildMissingDungeons(bestRuns);
    let currentScore = 0;

    for (const dungeon of dungeons) {
        currentScore += dungeon.score;
        if (dungeon.mythic_level >= levelToSimulate) {
            dungeon.potentialMinimumScore = 0;
            dungeon.target_level = dungeon.mythic_level;
            continue;
        }

        const simulatedScore = dungeonScoreService
            .setLevel(levelToSimulate)
            .setAffixes(dungeonService.getAffixesForLevel(levelToSimulate))
            .calculateScore();

        dungeon.potentialMinimumScore = simulatedScore - dungeon.score;
        dungeon.target_level = levelToSimulate;
    }

    return {
        dungeons,
        currentScore
    };
}

function calculateMinimumImprovements(data, seasonDungeons) {
    const dungeonService = new DungeonService(seasonDungeons);
    const bestRuns = Array.isArray(data.mythic_plus_best_runs) ? data.mythic_plus_best_runs : [];
    const dungeons = dungeonService.buildMissingDungeons(bestRuns);
    const dungeonScoreService = new DungeonScoreService();
    let currentScore = 0;

    for (const dungeon of dungeons) {
        const startLevelToCheck = dungeon.mythic_level === 0 ? 2 : dungeon.mythic_level;

        const currentScoreAtLevel = dungeonScoreService
            .setLevel(startLevelToCheck)
            .setAffixes(dungeonService.getAffixesForLevel(dungeon.mythic_level))
            .calculateScore();
        currentScore += dungeon.score;

        if (currentScoreAtLevel > dungeon.score + 10) {
            dungeon.potentialMinimumScore = currentScoreAtLevel - dungeon.score;
            dungeon.target_level = startLevelToCheck;
            continue;
        }

        const nextLevel = dungeon.mythic_level + dungeon.num_keystone_upgrades;
        const score = dungeonScoreService
            .setLevel(nextLevel)
            .setAffixes(dungeonService.getAffixesForLevel(nextLevel))
            .calculateScore();

        dungeon.potentialMinimumScore = score - dungeon.score;
        dungeon.target_level = nextLevel;
    }

    return {
        dungeons,
        currentScore,
    };
}

function buildArgsDataObject(cmdParts, argsDataObj, messageChannel) {
    let isSimplifiedCommand = false;
    for (const part of cmdParts) {
        if (part.includes('/')) {
            const regionRealmName = part.split('/');

            if (regionRealmName.length < 3) {
                messageChannel.send('Please supply a character in the format of region/realm/name.');

                argsDataObj.error = true;

                return argsDataObj;
            }

            argsDataObj.region = regionRealmName[0];
            argsDataObj.realm = regionRealmName[1];
            argsDataObj.name = regionRealmName[2];
            argsDataObj.realm = argsDataObj.realm.replace('\'', '');

            isSimplifiedCommand = true;
        }
    }

    if (!isSimplifiedCommand) {
        const nameIndex = cmdParts.indexOf('--name');
        if (nameIndex < 0) {
            messageChannel.send('Please supply a name.');

            argsDataObj.error = true;
            return argsDataObj;
        }

        argsDataObj.name = cmdParts[nameIndex + 1];

        const realmIndex = cmdParts.indexOf('--realm');
        if (realmIndex < 0) {
            messageChannel.send('Please supply a realm.');

            argsDataObj.error = true;
            return argsDataObj;
        }

        argsDataObj.realm = cmdParts[realmIndex + 1];

        const regionIndex = cmdParts.indexOf('--region');
        if (regionIndex > -1) {
            argsDataObj.region = cmdParts[regionIndex + 1];
        }
    }

    const bestRunsIndex = cmdParts.indexOf('--best-runs');
    if (bestRunsIndex > -1) {
        argsDataObj.getBestRuns = true;
        argsDataObj.getAltRuns = false;
    }

    const simulateIndex = cmdParts.indexOf('--simulate');
    if (simulateIndex > -1) {
        argsDataObj.isSimulateCommand = true;
        argsDataObj.getAltRuns = false;
        argsDataObj.simulateLevel = cmdParts[simulateIndex + 1];
    }

    return argsDataObj;
}

function parseMessageForArgs(message, messageChannel) {
    let dataToReturn = {
        error: false,
        name: '',
        realm: '',
        region: 'eu',
        isHelpCommand: false,
        isInfoCommand: false,
        getAltRuns: true,
        getBestRuns: false,
        isSimulateCommand: false,
        simulateLevel: null,
    };

    const args = message.trim().split(/ + /g);
    const cmd = args[0].slice();
    const cmdParts = cmd.split(' ');

    const helpIndex = cmdParts.indexOf('--help');
    if (helpIndex > -1) {
        dataToReturn.isHelpCommand = true;

        return dataToReturn;
    }

    const infoIndex = cmdParts.indexOf('--info');
    if (infoIndex > -1) {
        dataToReturn.isInfoCommand = true;

        return dataToReturn;
    }

    dataToReturn = buildArgsDataObject(cmdParts, dataToReturn, messageChannel);
    
    return dataToReturn;
}

function buildKeyLevelScoreRows() {
    const dungeonScoreService = new DungeonScoreService();
    const dungeonService = new DungeonService({});
    const rows = [];

    for (let level = 2; level <= 20; level++) {
        const score = dungeonScoreService
            .setLevel(level)
            .setAffixes(dungeonService.getAffixesForLevel(level))
            .calculateScore();

        rows.push([`+${level}`, score]);
    }

    return rows;
}

function buildHelpOutput() {
    const tableString = buildTableFromJson(getHelpJson());
    const quickGuideString = buildTableFromJson({
        title: '',
        heading: ['Command', 'Purpose'],
        rows: [
            ['help', 'Show command usage and examples'],
            ['info', 'Show scoring system details and project links'],
            ['<region/realm/name>', 'Analyze current runs and suggest best dungeons'],
            ['--simulate <level>', 'Simulate running all dungeons at a target key level'],
            ['--best-runs', 'Use best run data mode'],
        ]
    });
    const exampleString = buildTableFromJson({
        title: '',
        heading: 'Examples',
        rows: [
            ['/mwd-kp help'],
            ['/mwd-kp eu/argent-dawn/ellorett'],
            ['/mwd-kp eu/argent-dawn/ellorett --best-runs'],
            ['/mwd-kp eu/argent-dawn/ellorett --simulate 15'],
        ]
    });

    return `\n${tableString}\n\n${quickGuideString}\n\n${exampleString}`;
}

function buildInfoOutput() {
    const infoTable = buildTableFromJson({
        title: '',
        heading: ['MWD Keystone Planner', 'Details'],
        rows: [
            ['Description', 'Helps WoW players improve Mythic+ score by recommending high-impact dungeons.'],
            ['GitHub', 'https://github.com/tobytuuby/MWD-Keystone-Planner'],
            ['Website', 'https://tobytuuby.github.io/MWD-Keystone-Planner/'],
            ['Discord', 'https://discord.gg/ucgP4dvmtQ'],
            ['Support', 'https://ko-fi.com/mythicratinghelper'],
        ]
    });
    const formulaString = buildTableFromJson({
        title: '',
        heading: ['Scoring Formula', 'Value'],
        rows: [
            ['Keystone range', 'Starts at +2 and scales upward'],
            ['Base score at +2', '155'],
            ['Per key level', '+15 score per level'],
            ['Affix score', '0/15/30/45/60 by key bracket'],
            ['Total score', '125 + (15 x keyLevel) + affixScore'],
            ['+2 example', '125 + (15 x 2) + 0 = 155'],
        ]
    });
    const affixBracketString = buildTableFromJson({
        title: '',
        heading: ['Key Level', 'Affix Score'],
        rows: [
            ['+2 to +3', '0'],
            ['+4 to +6', '15'],
            ['+7 to +9', '30'],
            ['+10 to +11', '45'],
            ['+12+', '60'],
        ]
    });
    const scoreString = buildTableFromJson({
        title: '',
        heading: ['Keystone Level', 'Base Score (Completion)'],
        rows: buildKeyLevelScoreRows(),
    });

    return `\n${infoTable}\n\n${formulaString}\n\n${affixBracketString}\n\n${scoreString}`;
}

function getScoreForTimedCompletion(level, completionLevel, dungeonService, dungeonScoreService) {
    const completionBonusByLevel = {
        1: 0,
        2: 7.5,
        3: 15,
    };

    const baseScoreAtLevel = dungeonScoreService
        .setLevel(level)
        .setAffixes(dungeonService.getAffixesForLevel(level))
        .calculateScore();

    return baseScoreAtLevel + (completionBonusByLevel[completionLevel] ?? 0);
}

function buildFallbackSummary(score, totalPoints, sortedDungeons, seasonDungeons) {
    const dungeonService = new DungeonService(seasonDungeons);
    const dungeonScoreService = new DungeonScoreService();
    const dungeonRows = sortedDungeons.map((dungeon) => {
        const targetLevel = Number(dungeon.target_level);
        const completionGainOne = Math.ceil(
            getScoreForTimedCompletion(targetLevel, 1, dungeonService, dungeonScoreService) - dungeon.score
        );
        const completionGainTwo = Math.ceil(
            getScoreForTimedCompletion(targetLevel, 2, dungeonService, dungeonScoreService) - dungeon.score
        );
        const completionGainThree = Math.ceil(
            getScoreForTimedCompletion(targetLevel, 3, dungeonService, dungeonScoreService) - dungeon.score
        );

        return [
            dungeon.dungeon,
            `+${dungeon.mythic_level}`,
            `+${dungeon.target_level}`,
            `+${Math.ceil(dungeon.potentialMinimumScore)}`,
            `+${completionGainOne}`,
            `+${completionGainTwo}`,
            `+${completionGainThree}`,
        ];
    });

    const dungeonTable = buildTableFromJson({
        title: '',
        heading: ['Dungeon', 'Current', 'Target', 'Gain@Target', 'Completion +1', 'Completion +2', 'Completion +3'],
        rows: dungeonRows,
    });

    return `Current Score: ${Math.ceil(score)}\n`+
        `Minimum Total Score Increase: +${totalPoints}\n`+
        `Score after all runs: ${Math.ceil(score) + totalPoints}\n\n`+
        `${dungeonTable}`;
}

function buildRequestUrl(args) {
    const name = encodeURIComponent(args.name);

    return `https://raider.io/api/v1/characters/profile?region=${args.region}&realm=${args.realm}&name=${name}&fields=mythic_plus_best_runs%2Cmythic_plus_alternate_runs`;
}

async function requestData(args) {
    const url = buildRequestUrl(args);

    return axios({
        method: 'get',
        url: url,
    });
}

const handleError = async (error, interaction) => {
    if (error.code === 50001 || error.code === 50013) {
        const owner = await interaction.channel.guild.fetchOwner();
        if (!owner) {
            return;
        }

        owner.send(
            'Hey! It looks like I don\'t have the necessary permissions to function properly in your server.\n'+
            'Please reinvite me using the link on our website: https://tobytuuby.github.io/MWD-Keystone-Planner/\n'+
            'This is an automated message. If you have any queries, please reach out to coryrin on discord, or use the development discord group.'
        );

        sendStructuredResponseToUserViaSlashCommand(interaction, 'There was an error with the permissions. We\'ve notified the server admin.');
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mwd-kp')
        .setDescription('Get dungeons to run to improve overall mythic rating')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('The command to run. e.g. eu/argent-dawn/ellorett --simulate 15, eu/argent-dawn/ellorett --best-runs')
                .setRequired(true)
        ),
    async execute(interaction, message, isSlashCommand) {
        if (isSlashCommand) {
            await interaction.reply('Working on it...');
        }

        const method = isSlashCommand ? sendStructuredResponseToUserViaSlashCommand : sendStructuredResponseToUser;
        const normalizedMessage = message.trim().toLowerCase().replace(/[?!.]+$/, '');

        if (normalizedMessage === 'help' || normalizedMessage === '--help') {
            return method(interaction, buildHelpOutput());
        }
        if (normalizedMessage === 'info' || normalizedMessage === '--info') {
            return method(interaction, buildInfoOutput());
        }

        const args = parseMessageForArgs(message, interaction.channel);

        if (args.error) {
            return method(interaction, 'Invalid command format. Use `/mwd-kp command: help` for usage examples.');
        }

        try {
            const allData = await getDungeonData(args, interaction, method);
            const sortedDungeons = sortDungeonsBy(allData.dungeons, 'potentialMinimumScore');
            let totalPoints = 0;
            for (let i = 0; i < sortedDungeons.length; i++) {
                totalPoints += Math.ceil(sortedDungeons[i].potentialMinimumScore);
            }

            console.log(`Score Generated for: ${args.region}/${args.realm}/${args.name} Type: ${args.isSimulateCommand ? 'simulate' : 'normal'}`);

            try {
                const image = await generateMythicImage({
                    score: Math.ceil(allData.currentScore),
                    totalScoreIncrease: totalPoints,
                    dungeons: sortedDungeons,
                    message,
                });

                const fileName = message.split('/');
                fileName.push(new Date().toDateString());
                const attachment = new AttachmentBuilder(image, { name: fileName.join('-') + '.png' });

                return interaction.editReply({
                    files: [attachment],
                    content: 'Finding MWD Keystone Planner helpful? [Please consider supporting me](<https://ko-fi.com/mythicratinghelper>)\n'+
                        'Found an issue? [Report it on GitHub](<https://github.com/tobytuuby/MWD-Keystone-Planner>)\n'
                });
            } catch (imageError) {
                console.error(imageError);
                const seasonDungeons = new DetermineSeasonDungeonService().execute();
                return method(interaction, buildFallbackSummary(allData.currentScore, totalPoints, sortedDungeons, seasonDungeons));
            }
        } catch (err) {
            console.error(err);
            let errorMessageToSend = 'There was an error getting data from the server. Please try again.';
            if (err.response) {
                errorMessageToSend = `Error: ${err.response.data.message}`;
            } else if (err.message) {
                errorMessageToSend = `Error: ${err.message}`;
            }

            handleError(err, interaction);

            return method(interaction, errorMessageToSend);
        }
    },
};
