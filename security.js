const {
    EmbedBuilder,
    PermissionsBitField
} = require("discord.js");

/*
========================================
        MILO VERIFY - SECURITY
========================================
*/

const usuarios = new Map();
const configuraciones = new Map();

/*
========================================
        CONFIGURACIÓN POR SERVIDOR
========================================
*/

const configuracionDefault = {
    automod: true,

    antiSpam: true,
    antiLinks: false,
    antiInvites: true,
    antiMentions: true,
    antiInsultos: true,
    antiRaid: true,

    maxMensajes: 5,
    ventanaSpam: 5000,

    maxMentions: 5,

    maxWarnings: 3,

    accionWarnings: "timeout",

    timeoutMs: 10 * 60 * 1000,

    logChannelId: null,

    palabrasBloqueadas: [
        "idiota",
        "imbecil",
        "estupido",
        "estupida",
        "pendejo",
        "pendeja",
        "puto",
        "puta"
    ]
};

/*
========================================
        OBTENER CONFIGURACIÓN
========================================
*/

function obtenerConfiguracion(guildId) {

    if (!configuraciones.has(guildId)) {

        configuraciones.set(
            guildId,
            {
                ...configuracionDefault,

                palabrasBloqueadas: [
                    ...configuracionDefault.palabrasBloqueadas
                ]
            }
        );
    }

    return configuraciones.get(guildId);
}

/*
========================================
        GUARDAR CONFIGURACIÓN
========================================
*/

function guardarConfiguracion(
    guildId,
    datos
) {

    const actual =
        obtenerConfiguracion(guildId);

    configuraciones.set(
        guildId,
        {
            ...actual,
            ...datos
        }
    );

    return configuraciones.get(guildId);
}

/*
========================================
        USUARIO EXENTO
========================================
*/

function esExento(message) {

    if (!message.guild) {
        return true;
    }

    const miembro =
        message.member;

    if (!miembro) {
        return true;
    }

    /*
    Administradores no son afectados
    */

    if (
        miembro.permissions.has(
            PermissionsBitField.Flags.Administrator
        )
    ) {
        return true;
    }

    return false;
}

/*
========================================
        ANTI-SPAM
========================================
*/

function comprobarSpam(message, config) {

    if (!config.antiSpam) {
        return false;
    }

    const id =
        message.author.id;

    const ahora =
        Date.now();

    let datos =
        usuarios.get(id);

    if (!datos) {

        datos = {
            mensajes: [],
            warnings: 0,
            ultimaInfraccion: 0
        };

        usuarios.set(id, datos);
    }

    datos.mensajes =
        datos.mensajes.filter(
            tiempo =>
                ahora - tiempo <
                config.ventanaSpam
        );

    datos.mensajes.push(ahora);

    return (
        datos.mensajes.length >=
        config.maxMensajes
    );
}

/*
========================================
        ANTI-LINKS
========================================
*/

function contieneLink(contenido) {

    return /https?:\/\/\S+/i.test(
        contenido
    );
}

/*
========================================
        ANTI-INVITES
========================================
*/

function contieneInvite(contenido) {

    return /discord(?:\.gg|\.com\/invite)\/[a-z0-9-]+/i.test(
        contenido
    );
}

/*
========================================
        ANTI-MENCIONES
========================================
*/

function demasiadasMenciones(
    message,
    config
) {

    if (!config.antiMentions) {
        return false;
    }

    const mencionesUsuarios =
        message.mentions.users.size;

    const mencionesRoles =
        message.mentions.roles.size;

    return (
        mencionesUsuarios +
        mencionesRoles >=
        config.maxMentions
    );
}

/*
========================================
        NORMALIZAR TEXTO
========================================
*/

function normalizarTexto(texto) {

    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /[^a-z0-9\s]/g,
            " "
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}

/*
========================================
        ANTI-INSULTOS
========================================
*/

function contieneInsulto(
    contenido,
    config
) {

    if (!config.antiInsultos) {
        return false;
    }

    const texto =
        normalizarTexto(contenido);

    return config.palabrasBloqueadas.some(
        palabra => {

            const regex =
                new RegExp(
                    `\\b${escaparRegex(palabra)}\\b`,
                    "i"
                );

            return regex.test(texto);
        }
    );
}

/*
========================================
        ESCAPAR REGEX
========================================
*/

function escaparRegex(texto) {

    return texto.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}

/*
========================================
        RAID
========================================
*/

const entradas = new Map();

function detectarRaid(
    member,
    config
) {

    if (!config.antiRaid) {
        return false;
    }

    const guildId =
        member.guild.id;

    const ahora =
        Date.now();

    let datos =
        entradas.get(guildId);

    if (!datos) {

        datos = [];

        entradas.set(
            guildId,
            datos
        );
    }

    datos.push(ahora);

    /*
    Ventana de 30 segundos
    */

    const recientes =
        datos.filter(
            tiempo =>
                ahora - tiempo <
                30000
        );

    entradas.set(
        guildId,
        recientes
    );

    /*
    10 entradas en 30 segundos
    */

    return recientes.length >= 10;
}

/*
========================================
        ADVERTENCIAS
========================================
*/

function obtenerWarnings(
    guildId,
    userId
) {

    const clave =
        `${guildId}:${userId}`;

    const datos =
        usuarios.get(clave);

    return datos?.warnings || 0;
}

function agregarWarning(
    guildId,
    userId
) {

    const clave =
        `${guildId}:${userId}`;

    let datos =
        usuarios.get(clave);

    if (!datos) {

        datos = {
            mensajes: [],
            warnings: 0,
            ultimaInfraccion: 0
        };
    }

    datos.warnings++;

    datos.ultimaInfraccion =
        Date.now();

    usuarios.set(
        clave,
        datos
    );

    return datos.warnings;
}

/*
========================================
        PROCESAR INFRACCIÓN
========================================
*/

async function procesarInfraccion(
    message,
    tipo,
    motivo
) {

    if (!message.guild) {
        return;
    }

    const config =
        obtenerConfiguracion(
            message.guild.id
        );

    const warnings =
        agregarWarning(
            message.guild.id,
            message.author.id
        );

    /*
    Borrar mensaje
    */

    await message.delete()
        .catch(() => {});

    /*
    ========================================
    ACCIONES
    ========================================
    */

    const miembro =
        message.member;

    if (!miembro) {
        return;
    }

    if (
        warnings >=
        config.maxWarnings
    ) {

        if (
            config.accionWarnings ===
            "timeout"
        ) {

            await miembro
                .timeout(
                    config.timeoutMs,
                    `Milo Verify AutoMod: ${motivo}`
                )
                .catch(() => {});
        }

        else if (
            config.accionWarnings ===
            "kick"
        ) {

            await miembro
                .kick(
                    `Milo Verify AutoMod: ${motivo}`
                )
                .catch(() => {});
        }

        else if (
            config.accionWarnings ===
            "ban"
        ) {

            await miembro
                .ban({
                    reason:
                        `Milo Verify AutoMod: ${motivo}`
                })
                .catch(() => {});
        }
    }

    /*
    ========================================
    LOG
    ========================================
    */

    await enviarLog(
        message.guild,
        config,
        message,
        tipo,
        motivo,
        warnings
    );
}

/*
========================================
        ANALIZAR MENSAJE
========================================
*/

async function analizarMensaje(
    message
) {

    if (!message.guild) {
        return;
    }

    if (message.author.bot) {
        return;
    }

    const config =
        obtenerConfiguracion(
            message.guild.id
        );

    if (!config.automod) {
        return;
    }

    if (esExento(message)) {
        return;
    }

    const contenido =
        message.content || "";

    /*
    ANTI-SPAM
    */

    if (
        comprobarSpam(
            message,
            config
        )
    ) {

        return procesarInfraccion(
            message,
            "Anti-Spam",
            "Envío excesivo de mensajes."
        );
    }

    /*
    ANTI-INVITES
    */

    if (
        config.antiInvites &&
        contieneInvite(contenido)
    ) {

        return procesarInfraccion(
            message,
            "Anti-Invites",
            "Invitación de Discord no permitida."
        );
    }

    /*
    ANTI-LINKS
    */

    if (
        config.antiLinks &&
        contieneLink(contenido)
    ) {

        return procesarInfraccion(
            message,
            "Anti-Links",
            "Enlace no permitido."
        );
    }

    /*
    ANTI-MENCIONES
    */

    if (
        demasiadasMenciones(
            message,
            config
        )
    ) {

        return procesarInfraccion(
            message,
            "Anti-Mentions",
            "Demasiadas menciones."
        );
    }

    /*
    ANTI-INSULTOS
    */

    if (
        contieneInsulto(
            contenido,
            config
        )
    ) {

        return procesarInfraccion(
            message,
            "Anti-Insultos",
            "Palabra o expresión bloqueada."
        );
    }
}

/*
========================================
        DETECTAR ENTRADAS
========================================
*/

async function analizarEntrada(
    member
) {

    if (!member.guild) {
        return;
    }

    const config =
        obtenerConfiguracion(
            member.guild.id
        );

    if (!config.automod) {
        return;
    }

    if (!config.antiRaid) {
        return;
    }

    const raid =
        detectarRaid(
            member,
            config
        );

    if (!raid) {
        return;
    }

    await enviarLogRaid(
        member.guild,
        config,
        member
    );
}

/*
========================================
        LOG DE AUTOMOD
========================================
*/

async function enviarLog(
    guild,
    config,
    message,
    tipo,
    motivo,
    warnings
) {

    if (!config.logChannelId) {
        return;
    }

    const canal =
        guild.channels.cache.get(
            config.logChannelId
        );

    if (!canal) {
        return;
    }

    const embed =
        new EmbedBuilder()
            .setTitle(
                "🛡️ Milo Verify — AutoMod"
            )
            .setColor(0xED4245)
            .addFields(
                {
                    name: "👤 Usuario",
                    value:
                        `${message.author}\n\`${message.author.id}\``,
                    inline: true
                },
                {
                    name: "⚠️ Sistema",
                    value: tipo,
                    inline: true
                },
                {
                    name: "📋 Motivo",
                    value: motivo,
                    inline: false
                },
                {
                    name: "⚠️ Advertencias",
                    value:
                        `${warnings}`,
                    inline: true
                },
                {
                    name: "📍 Canal",
                    value:
                        `${message.channel}`,
                    inline: true
                }
            )
            .setTimestamp();

    await canal.send({
        embeds: [embed]
    }).catch(() => {});
}

/*
========================================
        LOG RAID
========================================
*/

async function enviarLogRaid(
    guild,
    config,
    member
) {

    if (!config.logChannelId) {
        return;
    }

    const canal =
        guild.channels.cache.get(
            config.logChannelId
        );

    if (!canal) {
        return;
    }

    const embed =
        new EmbedBuilder()
            .setTitle(
                "🚨 Posible Raid Detectado"
            )
            .setDescription(
                `Milo Verify detectó múltiples entradas recientes en **${guild.name}**.`
            )
            .setColor(0xED4245)
            .addFields({
                name: "👤 Último usuario",
                value:
                    `${member.user}\n\`${member.id}\``,
                inline: true
            })
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
        "messageCreate",
        async message => {

            await analizarMensaje(
                message
            );
        }
    );

    client.on(
        "guildMemberAdd",
        async member => {

            await analizarEntrada(
                member
            );
        }
    );
}

/*
========================================
        EXPORTAR
========================================
*/

module.exports = {
    obtenerConfiguracion,
    guardarConfiguracion,

    analizarMensaje,
    analizarEntrada,

    configurarEventos,

    agregarWarning,
    obtenerWarnings,

    contenerLink,
    contieneInvite,
    contieneInsulto,

    configuraciones,
    usuarios
};
