/*
========================================
        MILO VERIFY - WEB.JS
========================================

- Railway
- Cloudflare Turnstile
- CAPTCHA visual
- Sesiones mediante token
- Verificación por servidor/usuario
========================================
*/

const express = require("express");
const crypto = require("crypto");

const app = express();

const PORT = process.env.WEB_PORT || process.env.PORT || 3000;
const WEB_URL =
    process.env.WEB_URL || `http://localhost:${PORT}`;

const TURNSTILE_SITE_KEY =
    process.env.CLOUDFLARE_TURNSTILE_SITE_KEY;

const TURNSTILE_SECRET_KEY =
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/*
========================================
        SESIONES DE VERIFICACIÓN
========================================
*/

const sesiones = new Map();

/*
Crear una sesión desde verification.js

Ejemplo:

crearSesion({
    userId: interaction.user.id,
    guildId: interaction.guild.id
});

========================================
*/

function crearSesion({ userId, guildId }) {

    const token = crypto.randomBytes(32).toString("hex");

    const sesion = {
        token,
        userId,
        guildId,

        creada: Date.now(),

        turnstile: false,
        captcha: false,
        completada: false,

        captchaX: Math.floor(Math.random() * 55) + 25,
        captchaY: Math.floor(Math.random() * 45) + 25
    };

    sesiones.set(token, sesion);

    return `${WEB_URL.replace(/\/$/, "")}/verify/${token}`;
}

/*
========================================
        OBTENER SESIÓN
========================================
*/

function obtenerSesion(token) {
    return sesiones.get(token);
}

/*
========================================
        ELIMINAR SESIÓN
========================================
*/

function eliminarSesion(token) {
    sesiones.delete(token);
}

/*
========================================
        PÁGINA DE VERIFICACIÓN
========================================
*/

app.get("/verify/:token", (req, res) => {

    const token = req.params.token;
    const sesion = obtenerSesion(token);

    if (!sesion) {
        return res.status(404).send(paginaError(
            "Enlace inválido",
            "Este enlace de verificación no existe o ya expiró."
        ));
    }

    /*
    Expiración: 15 minutos
    */

    if (Date.now() - sesion.creada > 15 * 60 * 1000) {

        eliminarSesion(token);

        return res.status(410).send(paginaError(
            "Enlace expirado",
            "Solicita un nuevo enlace de verificación desde Discord."
        ));
    }

    if (sesion.completada) {

        return res.send(paginaExito(
            "Ya estás verificado",
            "Esta sesión de verificación ya fue completada."
        ));
    }

    res.send(`
<!DOCTYPE html>

<html lang="es">

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
>

<title>Milo Verify</title>

<script
    src="https://challenges.cloudflare.com/turnstile/v0/api.js"
    async
    defer>
</script>

<style>

* {
    box-sizing: border-box;
}

body {
    margin: 0;
    min-height: 100vh;

    display: flex;
    justify-content: center;
    align-items: center;

    font-family:
        Arial,
        Helvetica,
        sans-serif;

    background:
        radial-gradient(
            circle at top,
            #202938,
            #080b10 65%
        );

    color: white;
}

.container {
    width: min(94%, 520px);

    padding: 30px;

    border-radius: 22px;

    background: rgba(17, 22, 30, 0.96);

    border: 1px solid rgba(255,255,255,.08);

    box-shadow:
        0 25px 80px rgba(0,0,0,.55);

    text-align: center;
}

.logo {
    width: 70px;
    height: 70px;

    margin: auto;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 20px;

    background: #5865f2;

    font-size: 32px;
}

h1 {
    margin: 18px 0 8px;
}

.description {
    color: #aab2c0;
    line-height: 1.5;
}

.security-box {
    margin-top: 25px;
    padding: 20px;

    border-radius: 16px;

    background: #0d1219;

    border: 1px solid #252d39;
}

.turnstile {
    margin-top: 18px;

    display: flex;
    justify-content: center;
}

button {
    width: 100%;

    margin-top: 22px;

    padding: 14px;

    border: 0;

    border-radius: 12px;

    background: #5865f2;

    color: white;

    font-size: 16px;

    font-weight: bold;

    cursor: pointer;
}

button:hover {
    background: #4752c4;
}

button:disabled {
    opacity: .5;
    cursor: not-allowed;
}

.error {
    margin-top: 15px;

    color: #ff6b6b;

    display: none;
}

.success {
    margin-top: 15px;

    color: #57f287;

    display: none;
}

/*
========================================
CAPTCHA VISUAL
========================================
*/

#captchaSection {
    display: none;
}

.captcha-area {
    position: relative;

    width: 100%;
    height: 250px;

    margin-top: 20px;

    overflow: hidden;

    border-radius: 16px;

    background:
        linear-gradient(
            135deg,
            #1d2735,
            #10151d
        );

    border: 1px solid #303a48;
}

.target {
    position: absolute;

    width: 55px;
    height: 55px;

    border: 2px dashed #57f287;

    border-radius: 10px;

    background: rgba(87,242,135,.08);
}

.piece {
    position: absolute;

    width: 55px;
    height: 55px;

    left: 20px;
    top: 20px;

    border-radius: 10px;

    background: #5865f2;

    cursor: grab;

    touch-action: none;

    box-shadow:
        0 8px 20px rgba(0,0,0,.35);
}

.piece:active {
    cursor: grabbing;
}

.info {
    margin-top: 12px;

    color: #929baa;

    font-size: 13px;
}

</style>

</head>

<body>

<div class="container">

    <div class="logo">
        🛡️
    </div>

    <h1>Milo Verify</h1>

    <p class="description">
        Completa la comprobación de seguridad
        para verificar tu cuenta en Discord.
    </p>

    <div id="securityBox" class="security-box">

        <strong>
            🔐 Comprobación de seguridad
        </strong>

        <div class="turnstile">

            <div
                class="cf-turnstile"
                data-sitekey="${escapeHtml(
                    TURNSTILE_SITE_KEY || ""
                )}"
                data-callback="turnstileCompletado"
                data-expired-callback="turnstileExpirado"
                data-error-callback="turnstileError">
            </div>

        </div>

    </div>

    <div id="captchaSection">

        <div class="security-box">

            <strong>
                🧩 CAPTCHA visual
            </strong>

            <p class="info">
                Arrastra la pieza azul hasta el
                espacio marcado.
            </p>

            <div class="captcha-area">

                <div
                    class="target"
                    id="target">
                </div>

                <div
                    class="piece"
                    id="piece">
                </div>

            </div>

        </div>

        <button
            id="verifyButton"
            disabled>
            🛡️ Verificar
        </button>

    </div>

    <div
        id="error"
        class="error">
    </div>

    <div
        id="success"
        class="success">
    </div>

</div>

<script>

const TOKEN = ${JSON.stringify(token)};

let turnstileToken = null;
let captchaCompletado = false;

const piece =
    document.getElementById("piece");

const target =
    document.getElementById("target");

const button =
    document.getElementById("verifyButton");

const captchaSection =
    document.getElementById("captchaSection");

const error =
    document.getElementById("error");

const success =
    document.getElementById("success");

/*
========================================
CLOUDFLARE TURNSTILE
========================================
*/

function turnstileCompletado(token) {

    turnstileToken = token;

    captchaSection.style.display = "block";
}

function turnstileExpirado() {

    turnstileToken = null;

    captchaSection.style.display = "none";

    mostrarError(
        "La comprobación de Cloudflare expiró."
    );
}

function turnstileError() {

    turnstileToken = null;

    captchaSection.style.display = "none";

    mostrarError(
        "No se pudo completar la comprobación de seguridad."
    );
}

/*
========================================
CAPTCHA VISUAL
========================================
*/

const targetX =
    ${sesion.captchaX};

const targetY =
    ${sesion.captchaY};

target.style.left =
    targetX + "%";

target.style.top =
    targetY + "%";

let dragging = false;

let offsetX = 0;
let offsetY = 0;

function comenzar(e) {

    dragging = true;

    const rect =
        piece.getBoundingClientRect();

    const clientX =
        e.clientX ??
        e.touches?.[0]?.clientX;

    const clientY =
        e.clientY ??
        e.touches?.[0]?.clientY;

    offsetX =
        clientX - rect.left;

    offsetY =
        clientY - rect.top;

    if (piece.setPointerCapture &&
        e.pointerId !== undefined) {

        try {
            piece.setPointerCapture(e.pointerId);
        } catch {}
    }
}

function mover(e) {

    if (!dragging) return;

    const area =
        document
        .querySelector(".captcha-area");

    const rect =
        area.getBoundingClientRect();

    const clientX =
        e.clientX ??
        e.touches?.[0]?.clientX;

    const clientY =
        e.clientY ??
        e.touches?.[0]?.clientY;

    let x =
        clientX -
        rect.left -
        offsetX;

    let y =
        clientY -
        rect.top -
        offsetY;

    x =
        Math.max(
            0,
            Math.min(
                x,
                rect.width - piece.offsetWidth
            )
        );

    y =
        Math.max(
            0,
            Math.min(
                y,
                rect.height - piece.offsetHeight
            )
        );

    piece.style.left =
        x + "px";

    piece.style.top =
        y + "px";
}

function terminar() {

    if (!dragging) return;

    dragging = false;

    comprobarPosicion();
}

piece.addEventListener(
    "pointerdown",
    comenzar
);

document.addEventListener(
    "pointermove",
    mover
);

document.addEventListener(
    "pointerup",
    terminar
);

/*
========================================
COMPROBAR PIEZA
========================================
*/

function comprobarPosicion() {

    const pieceRect =
        piece.getBoundingClientRect();

    const targetRect =
        target.getBoundingClientRect();

    const centroPiezaX =
        pieceRect.left +
        pieceRect.width / 2;

    const centroPiezaY =
        pieceRect.top +
        pieceRect.height / 2;

    const dentroX =
        centroPiezaX >= targetRect.left &&
        centroPiezaX <= targetRect.right;

    const dentroY =
        centroPiezaY >= targetRect.top &&
        centroPiezaY <= targetRect.bottom;

    if (dentroX && dentroY) {

        captchaCompletado = true;

        button.disabled = false;

        piece.style.background =
            "#57f287";

        mostrarExito(
            "CAPTCHA completado. Pulsa Verificar."
        );

    } else {

        captchaCompletado = false;

        button.disabled = true;

        mostrarError(
            "La pieza no está en el lugar correcto."
        );
    }
}

/*
========================================
ENVIAR VERIFICACIÓN
========================================
*/

button.addEventListener(
    "click",
    async () => {

        if (!turnstileToken) {

            mostrarError(
                "Completa primero la comprobación de Cloudflare."
            );

            return;
        }

        if (!captchaCompletado) {

            mostrarError(
                "Completa el CAPTCHA visual."
            );

            return;
        }

        button.disabled = true;

        button.textContent =
            "⏳ Verificando...";

        try {

            const respuesta =
                await fetch(
                    "/api/verify",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            token: TOKEN,
                            turnstileToken,
                            captcha: true
                        })
                    }
                );

            const data =
                await respuesta.json();

            if (!respuesta.ok ||
                !data.success) {

                throw new Error(
                    data.message ||
                    "No se pudo verificar."
                );
            }

            mostrarExito(
                "✅ Verificación completada correctamente."
            );

            button.textContent =
                "✅ Verificado";

            button.disabled = true;

        } catch (error) {

            button.disabled = false;

            button.textContent =
                "🛡️ Verificar";

            mostrarError(
                error.message ||
                "Ocurrió un error."
            );
        }
    }
);

/*
========================================
MENSAJES
========================================
*/

function mostrarError(mensaje) {

    error.textContent = mensaje;

    error.style.display = "block";

    success.style.display = "none";
}

function mostrarExito(mensaje) {

    success.textContent = mensaje;

    success.style.display = "block";

    error.style.display = "none";
}

</script>

</body>

</html>
    `);
});

/*
========================================
        API DE VERIFICACIÓN
========================================
*/

app.post("/api/verify", async (req, res) => {

    try {

        const {
            token,
            turnstileToken,
            captcha
        } = req.body;

        if (!token) {

            return res.status(400).json({
                success: false,
                message: "Token inválido."
            });
        }

        const sesion =
            obtenerSesion(token);

        if (!sesion) {

            return res.status(404).json({
                success: false,
                message: "Sesión no encontrada."
            });
        }

        /*
        Verificar expiración
        */

        if (
            Date.now() - sesion.creada >
            15 * 60 * 1000
        ) {

            eliminarSesion(token);

            return res.status(410).json({
                success: false,
                message: "La sesión expiró."
            });
        }

        /*
        ========================================
        CLOUDFLARE TURNSTILE
        ========================================
        */

        if (!TURNSTILE_SECRET_KEY) {

            console.error(
                "Falta CLOUDFLARE_TURNSTILE_SECRET_KEY"
            );

            return res.status(500).json({
                success: false,
                message:
                    "Cloudflare no está configurado."
            });
        }

        if (!turnstileToken) {

            return res.status(400).json({
                success: false,
                message:
                    "Falta la comprobación de Cloudflare."
            });
        }

        const resultado =
            await verificarTurnstile(
                turnstileToken
            );

        if (!resultado.success) {

            return res.status(403).json({
                success: false,
                message:
                    "Cloudflare rechazó la comprobación."
            });
        }

        /*
        ========================================
        CAPTCHA VISUAL
        ========================================
        */

        if (captcha !== true) {

            return res.status(400).json({
                success: false,
                message:
                    "Completa el CAPTCHA visual."
            });
        }

        /*
        ========================================
        VERIFICACIÓN COMPLETADA
        ========================================
        */

        sesion.turnstile = true;
        sesion.captcha = true;
        sesion.completada = true;

        /*
        Aquí verification.js podrá recoger
        esta sesión y asignar el rol de Discord.
        */

        res.json({
            success: true,
            message: "Verificación completada.",
            userId: sesion.userId,
            guildId: sesion.guildId
        });

    } catch (error) {

        console.error(
            "Error en /api/verify:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Error interno del servidor."
        });
    }
});

/*
========================================
        CLOUDFLARE TURNSTILE
========================================
*/

async function verificarTurnstile(token) {

    const respuesta =
        await fetch(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },

                body:
                    new URLSearchParams({
                        secret:
                            TURNSTILE_SECRET_KEY,

                        response:
                            token
                    })
            }
        );

    if (!respuesta.ok) {

        return {
            success: false
        };
    }

    return await respuesta.json();
}

/*
========================================
        PÁGINA DE ERROR
========================================
*/

function paginaError(titulo, mensaje) {

    return `
<!DOCTYPE html>

<html lang="es">

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
>

<title>Milo Verify</title>

<style>

body {
    margin: 0;

    min-height: 100vh;

    display: flex;

    justify-content: center;

    align-items: center;

    background: #080b10;

    color: white;

    font-family: Arial, sans-serif;
}

.box {
    width: min(90%, 450px);

    padding: 35px;

    text-align: center;

    border-radius: 20px;

    background: #11161e;

    border: 1px solid #252d39;
}

.icon {
    font-size: 50px;
}

p {
    color: #9ca5b3;

    line-height: 1.5;
}

</style>

</head>

<body>

<div class="box">

    <div class="icon">
        ⚠️
    </div>

    <h1>
        ${escapeHtml(titulo)}
    </h1>

    <p>
        ${escapeHtml(mensaje)}
    </p>

</div>

</body>

</html>
    `;
}

/*
========================================
        PÁGINA DE ÉXITO
========================================
*/

function paginaExito(titulo, mensaje) {

    return `
<!DOCTYPE html>

<html lang="es">

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
>

<title>Milo Verify</title>

<style>

body {
    margin: 0;

    min-height: 100vh;

    display: flex;

    justify-content: center;

    align-items: center;

    background: #080b10;

    color: white;

    font-family: Arial, sans-serif;
}

.box {
    width: min(90%, 450px);

    padding: 35px;

    text-align: center;

    border-radius: 20px;

    background: #11161e;

    border: 1px solid #252d39;
}

.icon {
    font-size: 50px;
}

p {
    color: #9ca5b3;

    line-height: 1.5;
}

</style>

</head>

<body>

<div class="box">

    <div class="icon">
        ✅
    </div>

    <h1>
        ${escapeHtml(titulo)}
    </h1>

    <p>
        ${escapeHtml(mensaje)}
    </p>

</div>

</body>

</html>
    `;
}

/*
========================================
        ESCAPAR HTML
========================================
*/

function escapeHtml(text) {

    return String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/*
========================================
        HEALTH CHECK
========================================
*/

app.get("/health", (req, res) => {

    res.json({
        online: true,
        bot: "Milo Verify",
        service: "web",
        platform: "Railway"
    });
});

/*
========================================
        INICIAR WEB
========================================
*/

function iniciarWeb() {

    app.listen(
        PORT,
        "0.0.0.0",
        () => {

            console.log(
                `🌐 Milo Verify Web activo en el puerto ${PORT}`
            );

        }
    );
}

/*
========================================
        EXPORTACIONES
========================================
*/

module.exports = {
    app,
    iniciarWeb,
    crearSesion,
    obtenerSesion,
    eliminarSesion
};
