document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("mfaForm");
    const input = document.getElementById("mfaCode");
    const resendBtn = document.getElementById("resendBtn");

    let challengeId = localStorage.getItem("challenge_id");
    const rememberMe = localStorage.getItem("remember_me") === "true";

    let success = false;
    let isResending = false;
    let timerTimeout = null;
    let resendTimeout = null;

    const maskedEmail = localStorage.getItem("masked_email");

    if (maskedEmail) {
        const text = document.getElementById("mfaEmailText");
        if (text) {
            text.textContent = `Ingresa el código enviado a ${maskedEmail}`;
        }
    }

    const timerEl = document.getElementById("mfaTimer");

    let timeLeft = 300;
    let resendCooldown = 60;

    input.addEventListener("input", () => {
        input.value = input.value.replace(/\D/g, "");
    });

    function updateAttemptsText(attempts) {
        const el = document.getElementById("attemptsText");
        if (!el) return;

        if (attempts === null || attempts === "" || attempts === undefined) {
            el.textContent = "";
            return;
        }

        if (attempts === 0) {
            el.textContent = "Sin intentos restantes";
        } else {
            el.textContent = `Intentos restantes: ${attempts}`;
        }
    }

    function updateTimer() {
        if (timerTimeout) clearTimeout(timerTimeout);

        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;

        timerEl.textContent = `El código expira en ${minutes}:${seconds.toString().padStart(2, '0')}`;

        if (timeLeft <= 0) {
            timerEl.textContent = "El código ha expirado";

            input.disabled = true;
            document.getElementById("mfa-btn").disabled = true;
            return;
        }

        timeLeft--;

        timerTimeout = setTimeout(updateTimer, 1000);
    }

    updateTimer();

    function updateResendButton() {
        if (resendTimeout) clearTimeout(resendTimeout);

        if (resendCooldown > 0) {
            resendBtn.disabled = true;
            resendBtn.textContent = `Reenviar (${resendCooldown}s)`;
            resendCooldown--;

            resendTimeout = setTimeout(updateResendButton, 1000);
        } else {
            resendBtn.disabled = false;
            resendBtn.textContent = "Reenviar código";
        }
    }

    updateResendButton();

    function mostrarError(msg) {
        showAlert({
            type: "danger",
            message: msg
        });
    }

    if (!challengeId) {
        mostrarError("Sesión inválida. Vuelve a iniciar sesión.");
        setTimeout(() => {
            window.location.href = "login.html";
        }, 2000);
        return;
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const btn = document.getElementById("mfa-btn");
        btn.disabled = true;

        const code = input.value.trim();

        if (isResending) return;

        if (!code || code.length !== 6) {
            mostrarError("Código inválido");
            btn.disabled = false;
            return;
        }

        try {
            const response = await fetch("http://localhost:8000/auth/verify-mfa/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCookie("csrftoken")
                },
                credentials: "include",
                body: JSON.stringify({
                    challenge_id: challengeId,
                    code: code,
                    purpose: "login",
                    remember_me: rememberMe
                })
            });

            const data = await response.json();

            if (!response.ok) {

                if (data.attempts_left === 0) {
                    mostrarError("Has superado el número máximo de intentos");

                    localStorage.removeItem("challenge_id");

                    setTimeout(() => {
                        window.location.href = "login.html";
                    }, 2000);

                    return;
                }

                if (data.error === "Código expirado") {
                    mostrarError("El código expiró. Inicia sesión nuevamente.");

                    localStorage.removeItem("challenge_id");

                    setTimeout(() => {
                        window.location.href = "login.html";
                    }, 2000);

                    return;
                }

                let msg = data.error || "Código incorrecto";

                mostrarError(msg);

                if (data.attempts_left !== undefined) {
                    updateAttemptsText(data.attempts_left);
                }
                input.value = "";

                return;
            }

            success = true;
            localStorage.removeItem("challenge_id");
            localStorage.removeItem("masked_email");

            const leyenda = document.createElement("div");

            leyenda.textContent = "Verificando...";
            leyenda.classList.add("leyenda-sesion");
            leyenda.style.zIndex = "9999";

            document.body.appendChild(leyenda);

            void leyenda.offsetWidth;

            leyenda.classList.add("leyenda-entering");

            localStorage.setItem("user", JSON.stringify(data.user));

            leyenda.addEventListener("animationend", () => {

                const user = data.user;

                if (user.is_staff) {
                    window.location.href = "control.html";
                } else {
                    window.location.href = "main.html";
                }

            }, { once: true });

        } catch (error) {
            mostrarError("Error de conexión");
        } finally {
            if (!success) {
                btn.disabled = false;
            }
        }
    });

    resendBtn.addEventListener("click", async () => {

        resendBtn.disabled = true;
        resendBtn.textContent = "Enviando...";

        try {
            const response = await fetch("http://localhost:8000/auth/resend-mfa/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCookie("csrftoken")
                },
                credentials: "include",
                body: JSON.stringify({
                    challenge_id: challengeId
                })
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error);

            challengeId = data.challenge_id;
            localStorage.setItem("challenge_id", challengeId);
            localStorage.setItem("masked_email", data.masked_email);

            input.disabled = false;
            document.getElementById("mfa-btn").disabled = false;
            input.value = "";
            input.focus();

            timeLeft = 300;
            updateTimer();

            resendCooldown = 60;
            updateResendButton();

            updateAttemptsText(null);

            const text = document.getElementById("mfaEmailText");
            if (text) {
                text.textContent = `Ingresa el código enviado a ${data.masked_email}`;
            }

            showAlert({ type: "success", message: "Nuevo código enviado" });

        } catch (err) {
            showAlert({ type: "danger", message: err.message || "Error al reenviar código" });
        }
    });

    isResending = false;

});
