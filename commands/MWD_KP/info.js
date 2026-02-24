const { SlashCommandBuilder } = require('discord.js');
const {
    sendEmbeddedMessage,
} = require('../../reusables/functions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Get general information about MWD Keystone Planner'),
    async execute(interaction) {
        const messageObject = {
            color: '#5865F2',
            title: 'MWD Keystone Planner',
            description: 'MWD Keystone Planner helps WoW players improve Mythic+ score by analyzing runs and recommending the best dungeons to run next.',
            author: {
                name: 'Coryrin',
                link: 'https://www.corymeikle.com/',
                img: 'https://cdn.discordapp.com/attachments/647425968993992715/838076418570452992/20210501_163408.jpg',
            },
            fields: [
                {
                    name: 'GitHub',
                    value: '[Code](https://github.com/tobytuuby/MWD-Keystone-Planner)',
                    inline: true,
                },
                {
                    name: 'Twitter',
                    value: '[Follow me on Twitter](https://twitter.com/MRatingHelper)',
                    inline: true,
                },
                {
                    name: 'Website',
                    value: '[Check out our website!](https://tobytuuby.github.io/MWD-Keystone-Planner/)',
                    inline: true,
                },
                {
                    name: 'Discord',
                    value: '[Join the development discord!](https://discord.gg/ucgP4dvmtQ)',
                },
                {
                    name: 'Support',
                    value: '[Please consider supporting us](https://ko-fi.com/mythicratinghelper)',
                }
            ]
        };

        return sendEmbeddedMessage(interaction, messageObject);
    }
};
