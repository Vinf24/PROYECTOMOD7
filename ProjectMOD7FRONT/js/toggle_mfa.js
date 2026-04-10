document.addEventListener("DOMContentLoaded", () => {

    const btn = document.getElementById("toggleMFA");

    function mostrarMensaje(msg, type = "info") {
        showAlert({
            type: type,
            message: msg
        });
    }

    btn.addEventListener("click", async () => {
        try {
            const response = await fetch("http://localhost:8000/auth/toggle-mfa/", {
                method: "POST",
                headers: {
                    "X-CSRFToken": getCookie("csrftoken")
                },
                credentials: "include"
            });

            const data = await response.json();

            if (!response.ok) {
                mostrarMensaje("Error al cambiar MFA", "danger");
                return;
            }

            mostrarMensaje(
                "MFA ahora está: " + (data.mfa_required ? "ACTIVO" : "INACTIVO"),
                "success"
            );

            window.mfaEnabled = data.mfa_required;
            window.updateMFAButton();

        } catch (error) {
            mostrarMensaje("Error de conexión");
        }
    });

});
