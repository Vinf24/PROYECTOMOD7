document.addEventListener("DOMContentLoaded", async () => {

    let userIdToDelete = null;
    let userIdToEdit = null;
    let currentFilter = "true";

    const tbody = document.getElementById("usersTableBody");

    const editModal = new bootstrap.Modal(document.getElementById("editUserModal"));

    const editNames = document.getElementById("editNames");
    const editLastnames = document.getElementById("editLastnames");
    const editPassword = document.getElementById("editPassword");
    const editMFA = document.getElementById("editMFA");
    const editActive = document.getElementById("editActive");
    const saveEditUser = document.getElementById("saveEditUser");

    document.getElementById("editUserModal").addEventListener("hidden.bs.modal", () => {
        userIdToEdit = null;
    });

    loadUsers(currentFilter);

    document.addEventListener("click", (e) => {

        if (e.target.classList.contains("btn-delete")) {

            userIdToDelete = e.target.dataset.id;

            const currentUser = JSON.parse(localStorage.getItem("user"));

            showAlert({
                type: "danger",
                title: "Confirmar acción",
                message: "¿Seguro que deseas desactivar este usuario?",
                confirmText: "Eliminar",
                cancelText: "Cancelar",

                onConfirm: async () => {
                    try {
                        const response = await fetch(`http://localhost:8000/users/${userIdToDelete}/delete/`, {
                            method: "DELETE",
                            credentials: "include",
                            headers: {
                                "X-CSRFToken": getCookie("csrftoken")
                            }
                        });

                        if (!response.ok) throw new Error();

                        loadUsers(currentFilter);

                        showAlert({
                            type: "success",
                            message: "Usuario desactivado correctamente"
                        });

                    } catch (error) {
                        showAlert({
                            type: "danger",
                            message: "No se pudo eliminar el usuario"
                        });
                    }
                }
            });
        }

        if (e.target.classList.contains("filter-btn")) {

            currentFilter = e.target.dataset.filter;

            loadUsers(currentFilter);
        }

        if (e.target.classList.contains("btn-edit")) {

            userIdToEdit = e.target.dataset.id;

            saveEditUser.disabled = false;

            editNames.value = e.target.dataset.names;
            editLastnames.value = e.target.dataset.lastnames;
            editPassword.value = "";
            editMFA.checked = e.target.dataset.mfa === "true";
            editActive.checked = e.target.dataset.active === "true";

            editNames.defaultValue = editNames.value;
            editLastnames.defaultValue = editLastnames.value;
            editMFA.defaultChecked = editMFA.checked;
            editActive.defaultChecked = editActive.checked;

            const currentUser = JSON.parse(localStorage.getItem("user"));

            if (currentUser && currentUser.is_staff) {
                editActive.disabled = false;
            } else {
                editActive.disabled = true;
            }

            editModal.show();
        }

    });

    async function loadUsers(filter = "true") {

        try {
            let url = "http://localhost:8000/users/";

            if (filter !== "all") {
                url += `?active=${filter}`;
            }

            const response = await fetch(url, {
                method: "GET",
                credentials: "include"
            });

            if (!response.ok) {
                throw new Error("Error al obtener usuarios");
            }

            const users = await response.json();

            tbody.innerHTML = "";

            users.forEach(user => {
                const tr = document.createElement("tr");

                tr.innerHTML = `
                <td>${user.id}</td>
                <td>${user.names} ${user.lastnames}</td>
                <td>${user.email}</td>
                <td>${user.mfa_required ? "Sí" : "No"}</td>
                <td>
                    <button 
                        class="btn btn-sm btn-warning btn-edit"
                        data-id="${user.id}"
                        data-names="${user.names}"
                        data-lastnames="${user.lastnames}"
                        data-mfa="${user.mfa_required}"
                        data-active="${user.is_active}"
                    >
                        Editar
                    </button>
                    <button class="btn btn-sm btn-danger btn-delete" data-id="${user.id}">
                        Eliminar
                    </button>
                </td>
            `;

                tbody.appendChild(tr);
            });

        } catch (error) {
            console.error(error);
            showAlert({
                type: "danger",
                message: "Error cargando usuarios"
            });
        }

    }

    saveEditUser.addEventListener("click", async () => {

        if (!userIdToEdit) return;

        const data = {
            names: editNames.value.trim(),
            lastnames: editLastnames.value.trim(),
            mfa_required: editMFA.checked,
            is_active: editActive.checked
        };

        if (!data.names || !data.lastnames) {
            showAlert({
                type: "danger",
                message: "Nombre y apellido son obligatorios"
            });
            return;
        }

        if (editPassword.value.trim()) {
            data.password = editPassword.value.trim();
        }

        if (
            data.names === editNames.defaultValue &&
            data.lastnames === editLastnames.defaultValue &&
            !editPassword.value.trim() &&
            data.mfa_required === editMFA.defaultChecked &&
            data.is_active === editActive.defaultChecked
        ) {
            showAlert({
                type: "info",
                message: "No hay cambios para guardar"
            });
            return;
        }

        try {
            const response = await fetch(`http://localhost:8000/users/${userIdToEdit}/update/`, {
                method: "PATCH",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCookie("csrftoken")
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error();

            editModal.hide();
            loadUsers(currentFilter);

            showAlert({
                type: "success",
                message: "Usuario actualizado correctamente"
            });

        } catch (error) {
            showAlert({
                type: "danger",
                message: "Error al actualizar usuario"
            });
        } finally {
            saveEditUser.disabled = false;
        }
    });

});
