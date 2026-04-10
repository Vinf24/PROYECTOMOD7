document.addEventListener("DOMContentLoaded", function () {

    const loginForm = document.getElementById("loginForm");
    const emailInput = document.getElementById("emailLogin");
    const claveInput = document.getElementById("claveLogin");
    const chkRemember = document.getElementById("chkRemember");

    document.getElementById("guestBtn").addEventListener("click", () => {
        window.location.href = "main.html";
    });

    function validarLogin({ email, clave }) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email) return "Ingrese un correo electrónico";
        if (!clave) return "Ingrese una contraseña";
        if (!emailRegex.test(email)) return "Ingrese un correo electrónico válido";

        return null;
    }

    function mostrarError(mensaje) {
        showAlert({
            type: "danger",
            message: mensaje
        });
    }

    if (loginForm) {
        loginForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const btn = document.getElementById("btnLogin");

            if (btn.disabled) return;

            btn.disabled = true;
            btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Ingresando...`;

            const email = emailInput.value.trim();
            const clave = claveInput.value.trim();
            const recordar = chkRemember.checked;

            const error = validarLogin({ email, clave });

            if (error) {
                mostrarError(error);
                btn.disabled = false;
                btn.innerHTML = "Iniciar sesión";
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
                    localStorage.setItem("remember_me", "true");
                } else {
                    localStorage.removeItem("remember_me");
                }

                if (data.mfa_required === false) {

                    localStorage.setItem("user", JSON.stringify(data.user));

                    if (data.user.is_staff) {
                        window.location.href = "control.html";
                    } else {
                        window.location.href = "main.html";
                    }

                } else if (data.challenge_id) {

                    localStorage.setItem("challenge_id", data.challenge_id);
                    localStorage.setItem("masked_email", data.masked_email);

                    if (recordar) {
                        localStorage.setItem("remember_me", "true");
                    } else {
                        localStorage.removeItem("remember_me");
                    }

                    window.location.href = "verify_mfa.html";
                }

            } catch (error) {
                mostrarError("Error de conexión con el servidor");
            } finally {
                btn.disabled = false;
                btn.innerHTML = "Iniciar sesión";
            }
        });
    }

});
