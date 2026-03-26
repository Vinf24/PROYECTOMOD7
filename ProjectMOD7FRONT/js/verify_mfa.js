document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("mfaForm");
    const input = document.getElementById("mfaCode");

    const dlg = document.getElementById("dlgMFA");
    const dlgData = document.getElementById("dlgMFAData");
    const goBtn = document.getElementById("goMFA");

    const challengeId = localStorage.getItem("challenge_id");
    const rememberMe = localStorage.getItem("remember_me") === "true";

    let success = false;

    function mostrarError(msg) {
        dlgData.textContent = msg;
        showAlert(dlg, 3000);
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

        if (!code || code.length !== 6) {
            mostrarError("Código inválido");
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
                    remember_me: rememberMe
                })
            });

            const data = await response.json();

            if (!response.ok) {

                if (response.status === 403 && data.error === "MFA attempts exceeded") {
                    mostrarError("Demasiados intentos. Vuelve a iniciar sesión.");

                    localStorage.removeItem("challenge_id");

                    setTimeout(() => {
                        window.location.href = "login.html";
                    }, 2000);

                    return;
                }

                if (response.status === 403 && data.error === "MFA expired") {
                    mostrarError("El código expiró. Inicia sesión nuevamente.");

                    localStorage.removeItem("challenge_id");

                    setTimeout(() => {
                        window.location.href = "login.html";
                    }, 2000);

                    return;
                }

                mostrarError(data.error || "Código incorrecto");

                return;
            }

            success = true;
            localStorage.removeItem("challenge_id");

            const leyenda = document.createElement("div");
            leyenda.textContent = "Verificando...";
            leyenda.classList.add("leyenda-sesion");
            leyenda.style.zIndex = "9999";

            document.body.appendChild(leyenda);

            void leyenda.offsetWidth;

            leyenda.classList.add("leyenda-entering");

            leyenda.addEventListener("animationend", () => {
                window.location.href = "inicio.html";
            }, { once: true });

        } catch (error) {
            mostrarError("Error de conexión");
        } finally {
            if (!success) {
                btn.disabled = false;
            }
        }
    });

    goBtn.addEventListener("click", () => {
        hideAlert(dlg);
    });

});