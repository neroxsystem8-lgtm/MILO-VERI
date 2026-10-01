const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    RoleSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    PermissionsBitField
} = require("discord.js");

const verification =
    require("./verification.js");

const security =
    require("./security.js");

/*
========================================
        MILO VERIFY - SETUP
========================================
*/

const setups = new Map();

/*
========================================
        INICIAR CONFIGURACIÓN
========================================
*/

async function iniciarSetup(interaction) {

    if (!interaction.guild) {

        return interaction.reply({
            content:
                "❌ Este comando solo puede utilizarse dentro de un servidor.",
            ephemeral: true
        });
    }

    if (
        !interaction.member.permissions.has(
            PermissionsBitField.Flags.ManageGuild
        )
    ) {

        return interaction.reply({
            content:
                "❌ Necesitas el permiso **Gestionar servidor** para utilizar este comando.",
            ephemeral: true
        });
    }

    setups.set(
        interaction.user.id,
        {
            guildId:
                interaction.guild.id,

            usuarioId:
                interaction.user.id,

            descripcion:
                null,

            metodo:
                null,

            canalId:
                null,

            rolId:
                null,

            logChannelId:
                null,

            paso:
                1
        }
    );

    await interaction.reply({
        content:
            "🛠️ **Configuración de Milo Verify iniciada.**\n\n" +
            "Vamos a configurar el sistema paso a paso.",
        ephemeral: true
    });

    return mostrarDescripcion(
        interaction
    );
}

/*
========================================
        PREGUNTA 1
========================================
*/

async function mostrarDescripcion(
    interaction
) {

    const setup =
        setups.get(
            interaction.user.id
        );

    if (!setup) return;

    setup.paso = 1;

    const embed =
        new EmbedBuilder()
            .setTitle(
                "🛡️ Milo Verify — Configuración"
            )
            .setDescription(
                "**1️⃣ Descripción del panel**\n\n" +
                "Escribe la descripción que aparecerá " +
                "en el panel de verificación.\n\n" +
                "Ejemplo:\n" +
                "`Verifica tu cuenta para obtener acceso al servidor.`"
            )
            .setColor(0x5865F2);

    return interaction.editReply({
        content:
            "✏️ Escribe ahora la descripción del panel.",
        embeds: [embed]
    });
}

/*
========================================
        RECIBIR DESCRIPCIÓN
========================================
*/

async function recibirDescripcion(
    message
) {

    const setup =
        setups.get(
            message.author.id
        );

    if (!setup) return false;

    if (
        setup.guildId !==
        message.guild?.id
    ) {
        return false;
    }

    setup.descripcion =
        message.content.trim();

    setup.paso = 2;

    await message.delete()
        .catch(() => {});

    await mostrarMetodo(
        message
    );

    return true;
}

/*
========================================
        PREGUNTA 2
========================================
*/

async function mostrarMetodo(
    interaction
) {

    const setup =
        setups.get(
            interaction.user.id
        );

    if (!setup) return;

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId(
                "milo_setup_metodo"
            )
            .setPlaceholder(
                "Selecciona el tipo de verificación"
            )
            .addOptions(
                {
                    label:
                        "CAPTCHA",
                    description:
                        "Verificación mediante página web y CAPTCHA visual.",
                    value:
                        "captcha",
                    emoji:
                        "🧩"
                },
                {
                    label:
                        "Código",
                    description:
                        "El usuario introduce un código directamente en Discord.",
                    value:
                        "codigo",
                    emoji:
                        "🔢"
                },
                {
                    label:
                        "Sin verificación",
                    description:
                        "El usuario recibe el rol directamente.",
                    value:
                        "sin_verificacion",
                    emoji:
                        "⚡"
                }
            );

    const fila =
        new ActionRowBuilder()
            .addComponents(menu);

    const embed =
        new EmbedBuilder()
            .setTitle(
                "2️⃣ Tipo de verificación"
            )
            .setDescription(
                "Selecciona cómo deberán verificarse los usuarios."
            )
            .setColor(0x5865F2);

    return interaction.editReply({
        content: "",
        embeds: [embed],
        components: [fila]
    });
}

/*
========================================
        PREGUNTA 3
========================================
*/

async function mostrarCanal(
    interaction
) {

    const menu =
        new ChannelSelectMenuBuilder()
            .setCustomId(
                "milo_setup_canal"
            )
            .setPlaceholder(
                "Selecciona el canal del panel"
            )
            .setChannelTypes(
                ChannelType.GuildText
            );

    const fila =
        new ActionRowBuilder()
            .addComponents(menu);

    const embed =
        new EmbedBuilder()
            .setTitle(
                "3️⃣ Canal del panel"
            )
            .setDescription(
                "Selecciona el canal donde Milo Verify enviará el panel."
            )
            .setColor(0x5865F2);

    return interaction.update({
        content: "",
        embeds: [embed],
        components: [fila]
    });
}

/*
========================================
        PREGUNTA 4
========================================
*/

async function mostrarRol(
    interaction
) {

    const menu =
        new RoleSelectMenuBuilder()
            .setCustomId(
                "milo_setup_rol"
            )
            .setPlaceholder(
                "Selecciona el rol de verificación"
            );

    const fila =
        new ActionRowBuilder()
            .addComponents(menu);

    const embed =
        new EmbedBuilder()
            .setTitle(
                "4️⃣ Rol de verificación"
            )
            .setDescription(
                "Selecciona el rol que recibirá el usuario después de verificar."
            )
            .setColor(0x5865F2);

    return interaction.update({
        content: "",
        embeds: [embed],
        components: [fila]
    });
}

/*
========================================
        PREGUNTA 5
========================================
*/

async function mostrarLogs(
    interaction
) {

    const menu =
        new ChannelSelectMenuBuilder()
            .setCustomId(
                "milo_setup_logs"
            )
            .setPlaceholder(
                "Selecciona el canal de logs"
            )
            .setChannelTypes(
                ChannelType.GuildText
            );

    const fila =
        new ActionRowBuilder()
            .addComponents(menu);

    const embed =
        new EmbedBuilder()
            .setTitle(
                "5️⃣ Canal de logs"
            )
            .setDescription(
                "Selecciona el canal donde se registrarán las verificaciones y eventos de seguridad."
            )
            .setColor(0x5865F2);

    return interaction.update({
        content: "",
        embeds: [embed],
        components: [fila]
    });
}

/*
========================================
        RESUMEN
========================================
*/

async function mostrarResumen(
    interaction
) {

    const setup =
        setups.get(
            interaction.user.id
        );

    if (!setup) return;

    const metodoNombre = {

        captcha:
            "🧩 CAPTCHA",

        codigo:
            "🔢 Código",

        sin_verificacion:
            "⚡ Sin verificación"

    };

    const embed =
        new EmbedBuilder()
            .setTitle(
                "✅ Configuración lista"
            )
            .setDescription(
                "Revisa la configuración antes de enviar el panel."
            )
            .setColor(0x57F287)
            .addFields(
                {
                    name:
                        "📝 Descripción",
                    value:
                        setup.descripcion ||
                        "Sin descripción"
                },
                {
                    name:
                        "🔐 Método",
                    value:
                        metodoNombre[
                            setup.metodo
                        ] ||
                        "Desconocido",
                    inline: true
                },
                {
                    name:
                        "📢 Canal",
                    value:
                        `<#${setup.canalId}>`,
                    inline: true
                },
                {
                    name:
                        "🛡️ Rol",
                    value:
                        `<@&${setup.rolId}>`,
                    inline: true
                },
                {
                    name:
                        "📋 Logs",
                    value:
                        `<#${setup.logChannelId}>`,
                    inline: true
                }
            );

    const fila =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        "milo_setup_enviar"
                    )
                    .setLabel(
                        "Enviar panel"
                    )
                    .setEmoji("📨")
                    .setStyle(
                        ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "milo_setup_editar"
                    )
                    .setLabel(
                        "Editar"
                    )
                    .setEmoji("✏️")
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "milo_setup_cancelar"
                    )
                    .setLabel(
                        "Cancelar"
                    )
                    .setEmoji("❌")
                    .setStyle(
                        ButtonStyle.Danger
                    )
            );

    return interaction.update({
        content: "",
        embeds: [embed],
        components: [fila]
    });
}

/*
========================================
        ENVIAR PANEL
========================================
*/

async function enviarPanelConfigurado(
    interaction
) {

    const setup =
        setups.get(
            interaction.user.id
        );

    if (!setup) {

        return interaction.reply({
            content:
                "❌ No existe una configuración activa.",
            ephemeral: true
        });
    }

    const canal =
        interaction.guild.channels.cache.get(
            setup.canalId
        );

    if (!canal) {

        return interaction.reply({
            content:
                "❌ El canal configurado ya no existe.",
            ephemeral: true
        });
    }

    /*
    Guardar configuración
    */

    verification.guardarConfiguracion(
        interaction.guild.id,
        {
            descripcion:
                setup.descripcion,

            metodo:
                setup.metodo,

            canalId:
                setup.canalId,

            rolId:
                setup.rolId,

            logChannelId:
                setup.logChannelId
        }
    );

    /*
    Guardar logs también en AutoMod
    */

    security.guardarConfiguracion(
        interaction.guild.id,
        {
            logChannelId:
                setup.logChannelId
        }
    );

    await verification.enviarPanel(
        canal,
        setup
    );

    setups.delete(
        interaction.user.id
    );

    return interaction.update({
        content:
            `✅ **Panel enviado correctamente.**\n\n` +
            `📢 Canal: <#${setup.canalId}>\n` +
            `🛡️ Rol: <@&${setup.rolId}>`,
        embeds: [],
        components: []
    });
}

/*
========================================
        CANCELAR
========================================
*/

async function cancelarSetup(
    interaction
) {

    setups.delete(
        interaction.user.id
    );

    return interaction.update({
        content:
            "❌ Configuración cancelada.",
        embeds: [],
        components: []
    });
}

/*
========================================
        EDITAR
========================================
*/

async function editarSetup(
    interaction
) {

    return mostrarDescripcion(
        interaction
    );
}

/*
========================================
        INTERACCIONES
========================================
*/

function configurarEventos(client) {

    /*
    ====================================
    MENSAJES
    ====================================
    */

    client.on(
        "messageCreate",
        async message => {

            if (
                message.author.bot ||
                !message.guild
            ) {
                return;
            }

            await recibirDescripcion(
                message
            );
        }
    );

    /*
    ====================================
    SELECTS Y BOTONES
    ====================================
    */

    client.on(
        "interactionCreate",
        async interaction => {

            try {

                /*
                MÉTODO
                */

                if (
                    interaction.isStringSelectMenu() &&
                    interaction.customId ===
                    "milo_setup_metodo"
                ) {

                    const setup =
                        setups.get(
                            interaction.user.id
                        );

                    if (!setup) {

                        return interaction.reply({
                            content:
                                "❌ Esta configuración expiró.",
                            ephemeral: true
                        });
                    }

                    setup.metodo =
                        interaction.values[0];

                    setup.paso = 3;

                    return mostrarCanal(
                        interaction
                    );
                }

                /*
                CANAL
                */

                if (
                    interaction.isChannelSelectMenu() &&
                    interaction.customId ===
                    "milo_setup_canal"
                ) {

                    const setup =
                        setups.get(
                            interaction.user.id
                        );

                    if (!setup) {

                        return interaction.reply({
                            content:
                                "❌ Esta configuración expiró.",
                            ephemeral: true
                        });
                    }

                    setup.canalId =
                        interaction.values[0];

                    setup.paso = 4;

                    return mostrarRol(
                        interaction
                    );
                }

                /*
                ROL
                */

                if (
                    interaction.isRoleSelectMenu() &&
                    interaction.customId ===
                    "milo_setup_rol"
                ) {

                    const setup =
                        setups.get(
                            interaction.user.id
                        );

                    if (!setup) {

                        return interaction.reply({
                            content:
                                "❌ Esta configuración expiró.",
                            ephemeral: true
                        });
                    }

                    setup.rolId =
                        interaction.values[0];

                    setup.paso = 5;

                    return mostrarLogs(
                        interaction
                    );
                }

                /*
                LOGS
                */

                if (
                    interaction.isChannelSelectMenu() &&
                    interaction.customId ===
                    "milo_setup_logs"
                ) {

                    const setup =
                        setups.get(
                            interaction.user.id
                        );

                    if (!setup) {

                        return interaction.reply({
                            content:
                                "❌ Esta configuración expiró.",
                            ephemeral: true
                        });
                    }

                    setup.logChannelId =
                        interaction.values[0];

                    setup.paso = 6;

                    return mostrarResumen(
                        interaction
                    );
                }

                /*
                ENVIAR
                */

                if (
                    interaction.isButton() &&
                    interaction.customId ===
                    "milo_setup_enviar"
                ) {

                    return enviarPanelConfigurado(
                        interaction
                    );
                }

                /*
                EDITAR
                */

                if (
                    interaction.isButton() &&
                    interaction.customId ===
                    "milo_setup_editar"
                ) {

                    return editarSetup(
                        interaction
                    );
                }

                /*
                CANCELAR
                */

                if (
                    interaction.isButton() &&
                    interaction.customId ===
                    "milo_setup_cancelar"
                ) {

                    return cancelarSetup(
                        interaction
                    );
                }

            } catch (error) {

                console.error(
                    "Error en setup.js:",
                    error
                );

                if (
                    !interaction.replied &&
                    !interaction.deferred
                ) {

                    await interaction.reply({
                        content:
                            "❌ Ocurrió un error durante la configuración.",
                        ephemeral: true
                    }).catch(() => {});
                }
            }
        }
    );
}

/*
========================================
        EXPORTAR
========================================
*/

module.exports = {
    iniciarSetup,
    configurarEventos,
    setups
};
