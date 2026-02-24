const { SlashCommandBuilder } = require('discord.js');
const {
    sendStructuredResponseToUserViaSlashCommand,
    buildTableFromJson,
    getHelpJson
} = require('../../reusables/functions');

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
        const output = `\n${tableString}\n\n ${exampleString}`;

        return sendStructuredResponseToUserViaSlashCommand(interaction, output);
    }
};
