document.addEventListener("DOMContentLoaded", function () {

    const registerForm = document.getElementById("registerForm");
    const registroModal = document.getElementById("registroModal");

    const dlgRegister = document.getElementById("dlgRegister");
    const dlgRegisterData = document.getElementById("dlgRegisterData");
    const goRegister = document.getElementById("goRegister");

    function validarRegistro({ nombre, apellido, email, clave, claveRepeat }) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!nombre || !apellido) return "Ingrese nombre y apellido";
        if (!email) return "Ingrese un correo electrónico";
        if (!clave) return "Ingrese una contraseña";
        if (!emailRegex.test(email)) return "Ingrese un correo electrónico válido";
        if (clave !== claveRepeat) return "Confirme la contraseña";

        return null;
    }

    function mostrarMensaje(mensaje) {
        dlgRegisterData.textContent = mensaje;
        showAlert(dlgRegister, 3000);
    }

    if (registerForm) {
        registerForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const btn = document.getElementById("register");
            btn.disabled = true;

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
                mostrarMensaje(error);
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

                    mostrarMensaje(mensaje);
                    return;
                }

                mostrarMensaje(`Usuario ${data.user.names} registrado correctamente`);

                this.reset();

                const modal = bootstrap.Modal.getInstance(registroModal);
                modal.hide();

            } catch (error) {
                mostrarMensaje("Error de conexión con el servidor");
            } finally {
                btn.disabled = false;
            }
        });
    }

    if (goRegister) {
        goRegister.addEventListener("click", function () {
            hideAlert(dlgRegister);
        });
    }

});