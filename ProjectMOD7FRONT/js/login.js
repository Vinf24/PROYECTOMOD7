document.addEventListener("DOMContentLoaded", function () {

    const loginForm = document.getElementById("loginForm");
    const emailInput = document.getElementById("emailLogin");
    const claveInput = document.getElementById("claveLogin");
    const dlgLogin = document.getElementById("dlgLogin");
    const dlgLoginData = document.getElementById("dlgLoginData");
    const goLogin = document.getElementById("goLogin");
    const chkRemember = document.getElementById("chkRemember");

    function validarLogin({ email, clave }) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email) return "Ingrese un correo electrónico";
        if (!clave) return "Ingrese una contraseña";
        if (!emailRegex.test(email)) return "Ingrese un correo electrónico válido";

        return null;
    }

    function mostrarError(mensaje) {
        dlgLoginData.textContent = mensaje;
        showAlert(dlgLogin, 3000);
    }

    if (loginForm) {
        loginForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const btn = document.getElementById("btnLogin");
            btn.disabled = true;

            const email = emailInput.value.trim();
            const clave = claveInput.value.trim();
            const recordar = chkRemember.checked;

            const error = validarLogin({ email, clave });

            if (error) {
                mostrarError(error);
                return;
            }

            try {
                const response = await fetch("http://localhost:8000/auth/login/", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": getCookie("csrftoken")
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        email: email,
                        password: clave,
                        remember_me: recordar
                    })
                });

                console.log("STATUS:", response.status);

                const text = await response.text();
                console.log("RAW:", text);

                let data;
                try {
                    data = JSON.parse(text);
                } catch {
                    mostrarError("Respuesta inválida del servidor");
                    return;
                }

                if (!response.ok) {
                    mostrarError(data.detail || "Credenciales inválidas");
                    emailInput.value = "";
                    claveInput.value = "";
                    return;
                }

                if (recordar) {
                    localStorage.setItem("remember_me", recordar);
                } else {
                    localStorage.removeItem("remember_me");
                }

                if (data.mfa_required === false) {

                    window.location.href = "inicio.html";

                } else if (data.challenge_id) {

                    localStorage.setItem("challenge_id", data.challenge_id);

                    window.location.href = "verify_mfa.html";
                }

                const leyenda = document.createElement("div");
                leyenda.textContent = "Iniciando Sesión...";
                leyenda.classList.add("leyenda-sesion");
                leyenda.style.zIndex = "9999";

                document.body.appendChild(leyenda);

                void leyenda.offsetWidth;

                leyenda.classList.add("leyenda-entering");

                leyenda.addEventListener("animationend", () => {
                    leyenda.classList.remove("leyenda-entering");

                    setTimeout(() => {
                        leyenda.classList.add("leyenda-exiting");

                        leyenda.addEventListener("animationend", () => {
                            window.location.href = "verify_mfa.html";
                        }, { once: true });

                    }, 1000);

                }, { once: true });

            } catch (error) {
                mostrarError("Error de conexión con el servidor");
            } finally {
                btn.disabled = false;
            }
        });
    }

    if (goLogin) {
        goLogin.addEventListener("click", function () {
            hideAlert(dlgLogin);
        });
    }

});