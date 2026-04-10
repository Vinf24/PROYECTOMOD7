document.addEventListener("DOMContentLoaded", function () {

    const registerForm = document.getElementById("registerForm");
    const registroModal = document.getElementById("registroModal");

    function validarRegistro({ nombre, apellido, email, clave, claveRepeat }) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!nombre || !apellido) return "Ingrese nombre y apellido";
        if (nombre.length < 2) return "Nombre muy corto";
        if (apellido.length < 2) return "Apellido muy corto";

        if (!email) return "Ingrese un correo electrónico";
        if (!emailRegex.test(email)) return "Correo inválido";

        if (!clave) return "Ingrese una contraseña";
        if (clave.length < 6) return "La contraseña debe tener al menos 6 caracteres";

        if (clave !== claveRepeat) return "Las contraseñas no coinciden";

        return null;
    }

    function mostrarMensaje(mensaje, type = "info") {
        showAlert({
            type: type,
            message: mensaje
        });
    }

    if (registerForm) {
        registerForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const btn = document.getElementById("register");
            btn.disabled = true;
            btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Registrando...`;

            const nombre = document.getElementById("nombre").value.trim();
            const apellido = document.getElementById("apellido").value.trim();
            const email = document.getElementById("regEmail").value.trim();
            const clave = document.getElementById("regClave").value.trim();
            const claveRepeat = document.getElementById("regClaveRepeat").value.trim();

            const error = validarRegistro({
                nombre,
                apellido,
                email,
                clave,
                claveRepeat
            });

            if (error) {
                mostrarMensaje(error, "danger");

                if (!nombre) document.getElementById("nombre").focus();
                else if (!apellido) document.getElementById("apellido").focus();
                else if (!email) document.getElementById("regEmail").focus();
                else if (!clave) document.getElementById("regClave").focus();

                btn.disabled = false;
                btn.innerHTML = "Registrarse";
                return;
            }

            try {
                const response = await fetch("http://localhost:8000/auth/register/", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        names: nombre,
                        lastnames: apellido,
                        email: email,
                        password: clave
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    const mensaje =
                        data.email?.[0] ||
                        data.password?.[0] ||
                        data.names?.[0] ||
                        data.lastnames?.[0] ||
                        data.detail ||
                        "Error al registrar";

                    mostrarMensaje(mensaje, "danger");
                    return;
                }

                btn.disabled = false;

                mostrarMensaje(`Usuario ${data.user.names} registrado correctamente`, "success");

                this.reset();

                setTimeout(() => {
                    const modal = bootstrap.Modal.getInstance(registroModal);
                    modal.hide();
                }, 500);

                const modal = bootstrap.Modal.getInstance(registroModal);
                modal.hide();

            } catch (error) {
                mostrarMensaje("Error de conexión con el servidor", "danger");
            } finally {
                btn.disabled = false;
                btn.innerHTML = "Registrarse";
            }
        });
    }

});
