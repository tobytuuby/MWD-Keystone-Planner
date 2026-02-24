const { SlashCommandBuilder } = require('discord.js');
const {
    sendStructuredResponseToUserViaSlashCommand,
    buildTableFromJson,
    getHelpJson
} = require('../../reusables/functions');
const { DungeonScoreService } = require('../../services/DungeonScoreService');
const { DungeonService } = require('../../services/DungeonService');

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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Get help for using MWD Keystone Planner'),
    async execute(interaction) {
        await interaction.reply('Working on it...');

        const tableString = buildTableFromJson(getHelpJson());
        const exampleString = buildTableFromJson({
            title: '',
            heading: 'Examples',
            rows: [
                ['/mwd-kp eu/argent-dawn/ellorett'],
                ['/mwd-kp eu/argent-dawn/ellorett --best-runs'],
                ['/mwd-kp eu/argent-dawn/ellorett --simulate 15'],
            ]
        });
        const scoreString = buildTableFromJson({
            title: '',
            heading: ['Keystone Level', 'Base Score (Completion)'],
            rows: buildKeyLevelScoreRows(),
        });
        const output = `\n${tableString}\n\n${exampleString}\n\n${scoreString}`;

        return sendStructuredResponseToUserViaSlashCommand(interaction, output);
    }
};
