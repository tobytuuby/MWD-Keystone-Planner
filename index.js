const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { loadCommands } = require('./handler/loadCommands');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
    ]
});

client.once('ready', () => {
	console.log('Ready!');
});

client.commands = new Collection();

loadCommands(client);

client.on('interactionCreate', async interaction => {
	if (!interaction.isChatInputCommand()) {
        return;
    }

	const command = client.commands.get(interaction.commandName);
    
    if (!command) {
        return;
    }

    try {
        const message = interaction.options.getString('command', true);

        await command.execute(interaction, message, true);
    } catch (err) {
        console.error(err);
        await interaction.reply({content: 'There was an error whilst executing the command.'});
    }
});

client.login(process.env.TOKEN);
