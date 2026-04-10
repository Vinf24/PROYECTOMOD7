document.addEventListener("DOMContentLoaded", () => {

    const btnDelete = document.getElementById("deleteAccount");

    if (!btnDelete) return;

    btnDelete.addEventListener("click", () => {

        showAlert({
            type: "danger",
            title: "Eliminar cuenta",
            message: "¿Estás seguro que deseas eliminar tu cuenta? Esta acción no se puede deshacer.",
            confirmText: "Eliminar cuenta",
            cancelText: "Cancelar",

            onConfirm: async () => {
                try {
                    const response = await fetch("http://localhost:8000/auth/delete-account/", {
                        method: "DELETE",
                        credentials: "include",
                        headers: {
                            "X-CSRFToken": getCookie("csrftoken")
                        }
                    });

                    if (!response.ok) throw new Error();

                    localStorage.clear();

                    showAlert({
                        type: "success",
                        message: "Cuenta eliminada correctamente",
                        onConfirm: () => {
                            window.location.href = "login.html";
                        }
                    });

                } catch (error) {
                    showAlert({
                        type: "danger",
                        message: "Error al eliminar la cuenta"
                    });
                }
            }
        });

    });

});
