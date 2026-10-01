require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    ActivityType
} = require("discord.js");

const setup = require("./setup");
const verification = require("./verification");
const security = require("./security");
const web = require("./web");

/* =========================
   CONFIGURACIÓN
========================= */

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN) {
    console.error("❌ Falta DISCORD_TOKEN en el .env");
    process.exit(1);
}

if (!CLIENT_ID) {
    console.error("❌ Falta CLIENT_ID en el .env");
    process.exit(1);
}

/* =========================
   CLIENTE DISCORD
========================= */

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

/* =========================
   COMANDOS
========================= */

const commands = [
    {
        name: "setup",
        description: "Configura Milo Verify",
        options: [
            {
                name: "configura",
                description: "Configura el sistema de verificación",
                type: 1
            }
        ]
    }
];

/* =========================
   REGISTRAR COMANDOS
========================= */

async function registrarComandos() {

    const rest = new REST({
        version: "10"
    }).setToken(TOKEN);

    try {

        console.log("🔄 Registrando comandos...");

        if (GUILD_ID) {

            await rest.put(
                Routes.applicationGuildCommands(
                    CLIENT_ID,
                    GUILD_ID
                ),
                {
                    body: commands
                }
            );

            console.log("✅ Comandos registrados en el servidor.");

        } else {

            await rest.put(
                Routes.applicationCommands(
                    CLIENT_ID
                ),
                {
                    body: commands
                }
            );

            console.log("✅ Comandos globales registrados.");
        }

    } catch (error) {

        console.error(
            "❌ Error registrando comandos:",
            error
        );

    }
}

/* =========================
   ACTIVIDADES
========================= */

const actividades = [
    "🛡️ Milo Verify | /setup",
    "🔐 Verificando usuarios",
    "🧩 CAPTCHA activo",
    "🛡️ Protegiendo servidores",
    "🚨 AutoMod activo",
    "🔒 Seguridad activa"
];

let actividadActual = 0;

function cambiarActividad() {

    if (!client.user) return;

    client.user.setActivity(
        actividades[actividadActual],
        {
            type: ActivityType.Playing
        }
    );

    actividadActual++;

    if (actividadActual >= actividades.length) {
        actividadActual = 0;
    }
}

/* =========================
   READY
========================= */

client.once("ready", async () => {

    console.log("=================================");
    console.log("🛡️ MILO VERIFY");
    console.log("=================================");
    console.log(`🤖 Bot: ${client.user.tag}`);
    console.log(`🌐 Servidores: ${client.guilds.cache.size}`);
    console.log("🔐 Sistema de verificación: ACTIVO");
    console.log("🛡️ AutoMod: ACTIVO");
    console.log("=================================");

    cambiarActividad();

    setInterval(
        cambiarActividad,
        5 * 60 * 1000
    );

    await registrarComandos();

    try {

        await web.iniciarWeb();

        console.log("🌐 Página de verificación iniciada.");

    } catch (error) {

        console.error(
            "❌ Error iniciando página web:",
            error
        );

    }
});

/* =========================
   /SETUP
========================= */

client.on(
    "interactionCreate",
    async interaction => {

        if (!interaction.isChatInputCommand()) {
            return;
        }

        if (interaction.commandName !== "setup") {
            return;
        }

        const subcomando =
            interaction.options.getSubcommand();

        if (subcomando !== "configura") {
            return;
        }

        try {

            await setup.iniciarSetup(
                interaction
            );

        } catch (error) {

            console.error(
                "❌ Error en /setup:",
                error
            );

            if (!interaction.replied &&
                !interaction.deferred) {

                await interaction.reply({
                    content:
                        "❌ Ocurrió un error al iniciar la configuración.",
                    ephemeral: true
                });

            }
        }
    }
);

/* =========================
   EVENTOS DEL SISTEMA
========================= */

setup.configurarEventos(client);

verification.configurarEventos(client);

security.configurarEventos(client);

/* =========================
   ERRORES
========================= */

process.on(
    "unhandledRejection",
    error => {

        console.error(
            "❌ Unhandled Rejection:",
            error
        );

    }
);

process.on(
    "uncaughtException",
    error => {

        console.error(
            "❌ Uncaught Exception:",
            error
        );

    }
);

/* =========================
   INICIAR BOT
========================= */

client.login(TOKEN);
