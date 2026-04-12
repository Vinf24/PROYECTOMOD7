document.addEventListener("DOMContentLoaded", async () => {

    window.mfaEnabled = false;

    const controlPanelBtn = document.getElementById("controlPanelBtn");

    function showControlButton() {
        if (!controlPanelBtn) return;

        controlPanelBtn.classList.remove("d-none");

        controlPanelBtn.addEventListener("click", () => {
            window.location.href = "control.html";
        });
    }

    window.updateMFAButton = function () {
        const btn = document.getElementById("toggleMFA");

        if (!btn) return;

        if (window.mfaEnabled) {
            btn.classList.remove("btn-danger");
            btn.classList.add("btn-success");
            btn.textContent = "MFA Activado";
        } else {
            btn.classList.remove("btn-success");
            btn.classList.add("btn-danger");
            btn.textContent = "MFA Desactivado";
        }
    }

    async function handleMFA({ url, payload }) {

        let resp = await fetch(url, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCookie("csrftoken")
            },
            body: JSON.stringify(payload)
        });

        let data = await resp.json();
        console.log("Respuesta backend:", data);

        if (!data.mfa_required) return data;

        return new Promise((resolve, reject) => {

            let challengeId = data.challenge_id;
            let maskedEmail = data.masked_email;

            let startTime = Date.now();
            const duration = 5 * 60 * 1000;

            let expiryInterval = null;
            let resendInterval = null;

            const renderMFA = (errorMsg = "", attemptsLeft = null) => {

                if (expiryInterval) {
                    clearInterval(expiryInterval);
                    expiryInterval = null;
                }

                if (resendInterval) {
                    clearInterval(resendInterval);
                    resendInterval = null;
                }

                if (typeof closeAlert === "function") {
                    closeAlert();
                }

                const isBlocked = attemptsLeft === 0;

                showAlert({
                    title: "Verificación MFA",
                    html: `
                        <p class="text-detail">
                            Código enviado a <b>${maskedEmail}</b>
                        </p>

                        ${errorMsg ? `<div class="text-light mb-2">${errorMsg}</div>` : ""}

                        ${attemptsLeft !== null ? `
                            <div class="text-light mb-2">
                                Intentos restantes: ${attemptsLeft}
                            </div>
                        ` : ""}

                        <p id="mfaTimer" class="text-light small"></p>

                        <input 
                            id="mfaCode" 
                            class="form-control alert-input text-center mb-3"
                            placeholder="123456"
                            maxlength="6"
                            ${isBlocked ? "disabled" : ""}
                        >

                        <button 
                            id="resendCodeBtn" 
                            class="btn btn-soft w-100 mt-2"
                            ${isBlocked ? "disabled" : ""}
                        >
                            Reenviar código
                        </button>
                    `,
                    confirmText: isBlocked ? "Bloqueado" : "Verificar",
                    cancelText: "Cancelar",
                    onCancel: () => {
                        reject(new Error("Operación cancelada"));
                    },
                    onConfirm: async (values) => {

                        if (isBlocked) return false;

                        const code = values.mfaCode;

                        if (!code) {
                            renderMFA("Ingresa el código", attemptsLeft);
                            return false;
                        }

                        if (code.length !== 6) {
                            renderMFA("Código inválido", attemptsLeft);
                            return false;
                        }

                        try {
                            const resp2 = await fetch(url, {
                                method: "POST",
                                credentials: "include",
                                headers: {
                                    "Content-Type": "application/json",
                                    "X-CSRFToken": getCookie("csrftoken")
                                },
                                body: JSON.stringify({
                                    ...payload,
                                    challenge_id: challengeId,
                                    mfa_code: code
                                })
                            });

                            const data2 = await resp2.json();

                            if (!resp2.ok) {
                                renderMFA(
                                    data2.error,
                                    data2.attempts_left ?? null
                                );
                                return false;
                            }

                            if (data2.force_logout) {
                                window.location.href = "login.html";
                                return;
                            }

                            resolve(data2);

                        } catch {
                            renderMFA("Error de conexión", attemptsLeft);
                            return false;
                        }
                    }
                });

                setTimeout(() => {
                    const input = document.getElementById("mfaCode");
                    if (input) {
                        input.value = "";
                        if (!isBlocked) input.focus();
                    }
                }, 100);

                const timerEl = document.getElementById("mfaTimer");

                if (timerEl) {
                    expiryInterval = setInterval(() => {
                        const remaining = duration - (Date.now() - startTime);

                        if (remaining <= 0) {
                            clearInterval(expiryInterval);
                            timerEl.textContent = "Código expirado";
                            return;
                        }

                        const min = Math.floor(remaining / 60000);
                        const sec = Math.floor((remaining % 60000) / 1000);

                        timerEl.textContent = `Expira en: ${min}:${sec.toString().padStart(2, "0")}`;
                    }, 1000);
                }

                let resendCooldown = 30;

                setTimeout(() => {
                    const resendBtn = document.getElementById("resendCodeBtn");

                    if (!resendBtn) return;

                    resendBtn.disabled = true;

                    resendInterval = setInterval(() => {
                        resendCooldown--;

                        resendBtn.textContent = `Reenviar (${resendCooldown}s)`;

                        if (resendCooldown <= 0) {
                            clearInterval(resendInterval);
                            resendInterval = null;
                            resendBtn.disabled = false;
                            resendBtn.textContent = "Reenviar código";
                        }
                    }, 1000);

                    if (resendBtn && !isBlocked) {
                        resendBtn.onclick = async () => {

                            resendBtn.disabled = true;
                            resendBtn.textContent = "Enviando...";

                            startTime = Date.now();

                            try {
                                const resp3 = await fetch("http://localhost:8000/auth/resend-mfa/", {
                                    method: "POST",
                                    credentials: "include",
                                    headers: {
                                        "Content-Type": "application/json",
                                        "X-CSRFToken": getCookie("csrftoken")
                                    },
                                    body: JSON.stringify({
                                        challenge_id: challengeId
                                    })
                                });

                                const data3 = await resp3.json();

                                if (!resp3.ok) throw new Error();

                                challengeId = data3.challenge_id;
                                maskedEmail = data3.masked_email;

                                if (expiryInterval) {
                                    clearInterval(expiryInterval);
                                    expiryInterval = null;
                                }

                                if (resendInterval) {
                                    clearInterval(resendInterval);
                                    resendInterval = null;
                                }

                                renderMFA("Nuevo código enviado", null);

                            } catch {
                                renderMFA("Error al reenviar código", attemptsLeft);
                            }
                        };
                    }

                }, 100);
            };

            renderMFA();
        });
    }

    const namesInput = document.getElementById("namesInput");
    const lastnamesInput = document.getElementById("lastnamesInput");

    const saveBtn = document.getElementById("saveBtn");
    const changeEmailBtn = document.getElementById("changeEmailBtn");
    const changePasswordBtn = document.getElementById("changePasswordBtn");
    const deleteAccountBtn = document.getElementById("deleteAccountBtn");

    try {
        const resp = await fetch("http://localhost:8000/auth/me/", {
            credentials: "include"
        });

        const data = await resp.json();

        namesInput.value = data.names;
        lastnamesInput.value = data.lastnames;
        window.mfaEnabled = data.mfa_required;

        window.updateMFAButton();

        if (data.is_staff) {
            showControlButton();
        }

    } catch {
        showAlert({ type: "danger", message: "Error cargando datos" });
    }

    saveBtn.addEventListener("click", async () => {

        try {
            const resp = await fetch("http://localhost:8000/auth/me/", {
                method: "PATCH",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCookie("csrftoken")
                },
                body: JSON.stringify({
                    names: namesInput.value,
                    lastnames: lastnamesInput.value
                })
            });

            if (!resp.ok) throw new Error();

            showAlert({ type: "success", message: "Datos actualizados" });

        } catch {
            showAlert({ type: "danger", message: "Error al guardar" });
        }
    });

    changeEmailBtn.addEventListener("click", () => {

        showAlert({
            title: "Cambiar email",
            html: `
                <input id="currentEmail" class="form-control alert-input mb-2" placeholder="Email actual">
                <input id="newEmail" class="form-control alert-input" placeholder="Nuevo email">
            `,
            confirmText: "Guardar",
            cancelText: "Cancelar",
            onConfirm: async (values) => {

                const current = values.currentEmail.trim();
                const newEmail = values.newEmail.trim();

                if (!current || !newEmail) {
                    showAlert({ type: "danger", message: "Completa todos los campos" });
                    return false;
                }

                try {
                    const data = await handleMFA({
                        url: "http://localhost:8000/auth/change-email/",
                        payload: {
                            current_email: current,
                            new_email: newEmail
                        }
                    });

                    if (data?.force_logout) {
                        window.location.href = "login.html";
                        return;
                    }

                    console.log("Enviando:", {
                        current_email: current,
                        new_email: newEmail
                    });

                    showAlert({ type: "success", message: data.message });

                } catch (err) {
                    showAlert({ type: "danger", message: err.message });
                }
            }
        });
    });

    changePasswordBtn.addEventListener("click", () => {

        showAlert({
            title: "Cambiar contraseña",
            html: `
                <input id="oldPass" type="password" class="form-control alert-input mb-2" placeholder="Actual">
                <input id="newPass" type="password" class="form-control alert-input mb-2" placeholder="Nueva">
                <input id="confirmPass" type="password" class="form-control alert-input" placeholder="Confirmar">
            `,
            confirmText: "Guardar",
            cancelText: "Cancelar",
            onConfirm: async (values) => {

                const { oldPass, newPass, confirmPass } = values;

                if (!oldPass || !newPass || !confirmPass) {
                    showAlert({ type: "danger", message: "Completa todos los campos" });
                    return false;
                }

                if (newPass !== confirmPass) {
                    showAlert({ type: "danger", message: "Las contraseñas no coinciden" });
                    return false;
                }

                try {
                    const data = await handleMFA({
                        url: "http://localhost:8000/auth/change-password/",
                        payload: {
                            old_password: oldPass,
                            new_password: newPass,
                            confirm_password: confirmPass
                        }
                    });

                    if (data?.force_logout) {
                        window.location.href = "login.html";
                        return;
                    }

                    showAlert({ type: "success", message: data.message });

                } catch (err) {
                    showAlert({ type: "danger", message: err.message });
                }
            }
        });
    });

    deleteAccountBtn.addEventListener("click", () => {

        showAlert({
            title: "Eliminar cuenta",
            html: `
                <p>Escribe <b>eliminar</b> para confirmar</p>
                <input id="confirmDelete" class="form-control alert-input">
            `,
            confirmText: "Eliminar",
            cancelText: "Cancelar",
            onConfirm: async (values) => {

                const val = values.confirmDelete;

                if (val !== "eliminar") {
                    showAlert({ type: "danger", message: "Debes escribir 'eliminar'" });
                    return false;
                }

                try {
                    const data = await handleMFA({
                        url: "http://localhost:8000/auth/delete-account/",
                        payload: {}
                    });

                    if (data?.force_logout) {
                        window.location.href = "login.html";
                        return;
                    }

                    showAlert({
                        type: "success",
                        message: data.message || "Cuenta eliminada correctamente"
                    });

                    setTimeout(() => {
                        window.location.href = "login.html";
                    }, 1500);

                } catch (err) {
                    showAlert({
                        type: "danger",
                        message: err.message || "Operación cancelada"
                    });
                }
            }
        });
    });

});
