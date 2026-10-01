const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

const crypto = require("crypto");

const sesionesCodigo = new Map();
const configuraciones = new Map();

/*
========================================
        CONFIGURACIÓN
========================================
*/

function guardarConfiguracion(guildId, configuracion) {

    configuraciones.set(
        guildId,
        configuracion
    );
}

function obtenerConfiguracion(guildId) {

    return configuraciones.get(guildId);
}

/*
========================================
        GENERAR CÓDIGO
========================================
*/

function generarCodigo() {

    return crypto
        .randomInt(100000, 1000000)
        .toString();
}

/*
========================================
        PANEL DE VERIFICACIÓN
========================================
*/

async function enviarPanel(
    canal,
    configuracion
) {

    const embed = new EmbedBuilder()
        .setTitle("🛡️ Verificación")
        .setDescription(
            configuracion.descripcion ||
            "Completa la verificación para acceder al servidor."
        )
        .setColor(
            configuracion.color || 0x5865F2
        )
        .setFooter({
            text: "Milo Verify"
        });

    const boton = new ButtonBuilder()
        .setCustomId("milo_verificar")
        .setLabel("Verificar")
        .setEmoji("🛡️")
        .setStyle(ButtonStyle.Primary);

    const fila = new ActionRowBuilder()
        .addComponents(boton);

    return canal.send({
        embeds: [embed],
        components: [fila]
    });
}

/*
========================================
        BOTÓN VERIFICAR
========================================
*/

async function manejarBotonVerificar(
    interaction
) {

    const guildId =
        interaction.guildId;

    const configuracion =
        obtenerConfiguracion(guildId);

    if (!configuracion) {

        return interaction.reply({
            content:
                "❌ Este servidor todavía no tiene configurada la verificación.",
            ephemeral: true
        });
    }

    /*
    ========================================
    CAPTCHA
    ========================================
    */

    if (
        configuracion.metodo === "captcha"
    ) {

        const web =
            require("./web.js");

        const enlace =
            web.crearSesion({
                userId:
                    interaction.user.id,

                guildId:
                    interaction.guildId
            });

        return interaction.reply({
            content:
                `🧩 **Completa tu verificación**\n\n` +
                `Pulsa el siguiente enlace para continuar:\n` +
                `🔗 ${enlace}\n\n` +
                `⚠️ Este enlace está vinculado a tu cuenta y a este servidor.`,
            ephemeral: true
        });
    }

    /*
    ========================================
    CÓDIGO
    ========================================
    */

    if (
        configuracion.metodo === "codigo"
    ) {

        const codigo =
            generarCodigo();

        sesionesCodigo.set(
            `${guildId}:${interaction.user.id}`,
            {
                codigo,
                guildId,
                userId:
                    interaction.user.id,

                creado:
                    Date.now(),

                intentos: 0
            }
        );

        const modal =
            new ModalBuilder()
                .setCustomId(
                    "milo_codigo_verificacion"
                )
                .setTitle(
                    "🔐 Código de verificación"
                );

        const campo =
            new TextInputBuilder()
                .setCustomId("codigo")
                .setLabel(
                    "Introduce el código"
                )
                .setPlaceholder(
                    "Ejemplo: 583921"
                )
                .setStyle(
                    TextInputStyle.Short
                )
                .setMinLength(6)
                .setMaxLength(6)
                .setRequired(true);

        const fila =
            new ActionRowBuilder()
                .addComponents(campo);

        modal.addComponents(fila);

        await interaction.reply({
            content:
                `🔐 Tu código de verificación es:\n\n` +
                `**\`${codigo}\`**\n\n` +
                `Introduce este código en el formulario.`,
            ephemeral: true
        });

        /*
        Abrimos el modal después de responder.
        */

        setTimeout(async () => {

            try {

                await interaction.followUp({
                    content:
                        "👇 Introduce el código:",
                    ephemeral: true
                });

            } catch {}
        }, 300);

        return;
    }

    /*
    ========================================
    SIN VERIFICACIÓN
    ========================================
    */

    if (
        configuracion.metodo ===
        "sin_verificacion"
    ) {

        return verificarUsuario(
            interaction,
            configuracion
        );
    }

    return interaction.reply({
        content:
            "❌ Método de verificación desconocido.",
        ephemeral: true
    });
}

/*
========================================
        MODAL DEL CÓDIGO
========================================
*/

async function manejarModalCodigo(
    interaction
) {

    const codigoIngresado =
        interaction.fields
            .getTextInputValue(
                "codigo"
            )
            .trim();

    const clave =
        `${interaction.guildId}:${interaction.user.id}`;

    const datos =
        sesionesCodigo.get(clave);

    if (!datos) {

        return interaction.reply({
            content:
                "❌ Tu código ya expiró o no existe. Pulsa Verificar nuevamente.",
            ephemeral: true
        });
    }

    /*
    Código válido durante 5 minutos.
    */

    if (
        Date.now() - datos.creado >
        5 * 60 * 1000
    ) {

        sesionesCodigo.delete(clave);

        return interaction.reply({
            content:
                "⏰ Tu código expiró. Genera uno nuevo.",
            ephemeral: true
        });
    }

    datos.intentos++;

    /*
    Máximo 5 intentos.
    */

    if (datos.intentos > 5) {

        sesionesCodigo.delete(clave);

        return interaction.reply({
            content:
                "🚫 Superaste el límite de intentos. Genera un nuevo código.",
            ephemeral: true
        });
    }

    if (
        codigoIngresado !==
        datos.codigo
    ) {

        return interaction.reply({
            content:
                `❌ Código incorrecto.\n` +
                `Intentos restantes: **${
                    5 - datos.intentos
                }**`,
            ephemeral: true
        });
    }

    sesionesCodigo.delete(clave);

    const configuracion =
        obtenerConfiguracion(
            interaction.guildId
        );

    if (!configuracion) {

        return interaction.reply({
            content:
                "❌ La configuración de verificación no existe.",
            ephemeral: true
        });
    }

    await verificarUsuario(
        interaction,
        configuracion
    );
}

/*
========================================
        VERIFICAR USUARIO
========================================
*/

async function verificarUsuario(
    interaction,
    configuracion
) {

    const guild =
        interaction.guild;

    if (!guild) {

        return interaction.reply({
            content:
                "❌ No se pudo encontrar el servidor.",
            ephemeral: true
        });
    }

    const miembro =
        await guild.members
            .fetch(interaction.user.id)
            .catch(() => null);

    if (!miembro) {

        return interaction.reply({
            content:
                "❌ No se pudo encontrar tu usuario en el servidor.",
            ephemeral: true
        });
    }

    /*
    ========================================
    ROL
    ========================================
    */

    const rolId =
        configuracion.rolId;

    if (!rolId) {

        return interaction.reply({
            content:
                "❌ No hay un rol de verificación configurado.",
            ephemeral: true
        });
    }

    const rol =
        guild.roles.cache.get(rolId);

    if (!rol) {

        return interaction.reply({
            content:
                "❌ El rol configurado ya no existe.",
            ephemeral: true
        });
    }

    /*
    Verificar jerarquía
    */

    if (
        guild.members.me &&
        rol.position >=
        guild.members.me.roles.highest.position
    ) {

        return interaction.reply({
            content:
                "❌ No puedo asignar ese rol porque está por encima de mi rol.",
            ephemeral: true
        });
    }

    /*
    Ya tiene el rol
    */

    if (miembro.roles.cache.has(rol.id)) {

        return interaction.reply({
            content:
                "ℹ️ Ya estás verificado.",
            ephemeral: true
        });
    }

    /*
    ========================================
    ASIGNAR ROL
    ========================================
    */

    try {

        await miembro.roles.add(
            rol,
            "Milo Verify - Usuario verificado"
        );

    } catch (error) {

        console.error(
            "Error asignando rol:",
            error
        );

        return interaction.reply({
            content:
                "❌ No pude asignarte el rol. Revisa los permisos y la posición del rol del bot.",
            ephemeral: true
        });
    }

    /*
    ========================================
    RESPUESTA
    ========================================
    */

    const embed =
        new EmbedBuilder()
            .setTitle(
                "✅ Verificación completada"
            )
            .setDescription(
                `Has sido verificado correctamente en **${guild.name}**.`
            )
            .setColor(0x57F287)
            .addFields({
                name: "👤 Usuario",
                value:
                    `${interaction.user}\n\`${interaction.user.id}\``,
                inline: true
            })
            .addFields({
                name: "🛡️ Rol",
                value:
                    `${rol}`,
                inline: true
            })
            .setTimestamp();

    return interaction.reply({
        embeds: [embed],
        ephemeral: true
    });
}

/*
========================================
        PROCESAR CAPTCHA WEB
========================================
*/

/*
Esta función será utilizada por index.js
cuando la página web confirme que el
CAPTCHA fue completado.
*/

async function completarCaptcha(
    client,
    userId,
    guildId
) {

    try {

        const guild =
            await client.guilds
                .fetch(guildId);

        const miembro =
            await guild.members
                .fetch(userId);

        const configuracion =
            obtenerConfiguracion(
                guildId
            );

        if (!configuracion) {
            return false;
        }

        const rol =
            guild.roles.cache.get(
                configuracion.rolId
            );

        if (!rol) {
            return false;
        }

        if (
            guild.members.me &&
            rol.position >=
            guild.members.me.roles.highest.position
        ) {

            console.error(
                "El rol de verificación está por encima del bot."
            );

            return false;
        }

        if (
            !miembro.roles.cache.has(
                rol.id
            )
        ) {

            await miembro.roles.add(
                rol,
                "Milo Verify - CAPTCHA completado"
            );
        }

        /*
        LOG
        */

        await enviarLog(
            guild,
            configuracion,
            miembro,
            "CAPTCHA"
        );

        return true;

    } catch (error) {

        console.error(
            "Error completando CAPTCHA:",
            error
        );

        return false;
    }
}

/*
========================================
        LOGS
========================================
*/

async function enviarLog(
    guild,
    configuracion,
    miembro,
    metodo
) {

    if (!configuracion.logChannelId) {
        return;
    }

    const canal =
        guild.channels.cache.get(
            configuracion.logChannelId
        );

    if (!canal) {
        return;
    }

    const embed =
        new EmbedBuilder()
            .setTitle(
                "🛡️ Usuario verificado"
            )
            .setColor(0x57F287)
            .addFields(
                {
                    name: "👤 Usuario",
                    value:
                        `${miembro.user}\n\`${miembro.id}\``,
                    inline: true
                },
                {
                    name: "🔐 Método",
                    value: metodo,
                    inline: true
                },
                {
                    name: "🏠 Servidor",
                    value:
                        `${guild.name}\n\`${guild.id}\``,
                    inline: false
                }
            )
            .setTimestamp();

    await canal.send({
        embeds: [embed]
    }).catch(() => {});
}

/*
========================================
        EVENTOS
========================================
*/

function configurarEventos(client) {

    client.on(
        "interactionCreate",
        async interaction => {

            try {

                /*
                Botón
                */

                if (
                    interaction.isButton() &&
                    interaction.customId ===
                    "milo_verificar"
                ) {

                    return manejarBotonVerificar(
                        interaction
                    );
                }

                /*
                Modal
                */

                if (
                    interaction.isModalSubmit() &&
                    interaction.customId ===
                    "milo_codigo_verificacion"
                ) {

                    return manejarModalCodigo(
                        interaction
                    );
                }

            } catch (error) {

                console.error(
                    "Error en verification.js:",
                    error
                );

                if (
                    !interaction.replied &&
                    !interaction.deferred
                ) {

                    await interaction.reply({
                        content:
                            "❌ Ocurrió un error procesando la verificación.",
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
    guardarConfiguracion,
    obtenerConfiguracion,

    enviarPanel,

    manejarBotonVerificar,
    manejarModalCodigo,

    verificarUsuario,
    completarCaptcha,

    enviarLog,

    configurarEventos,

    sesionesCodigo,
    configuraciones
};
