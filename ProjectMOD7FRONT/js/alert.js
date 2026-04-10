document.addEventListener("DOMContentLoaded", () => {

    const alertOverlay = document.getElementById("globalAlert");
    const alertBox = document.getElementById("alertBox");
    const alertTitle = document.getElementById("alertTitle");
    const alertMessage = document.getElementById("alertMessage");
    const alertButtons = document.getElementById("alertButtons");

    window.showAlert = function ({
        type = "info",
        title = "",
        message = "",
        html = null,
        confirmText = "Entendido",
        cancelText = null,
        onConfirm = null,
        onCancel = null
    }) {

        alertBox.className = "d-flex flex-column gap-2 text-center p-3 rounded-3";

        const typeClass = {
            danger: "alert-warning-custom",
            success: "alert-success-custom",
            info: "alert-info-custom"
        };

        alertBox.classList.add(typeClass[type] || typeClass.info);

        alertTitle.textContent = title;
        if (html) {
            alertMessage.innerHTML = html;
        } else {
            alertMessage.textContent = message;
        }

        alertButtons.innerHTML = "";

        const btnConfirm = document.createElement("button");
        btnConfirm.className = `alert-btn alert-btn-${type}`;
        btnConfirm.textContent = confirmText;

        btnConfirm.onclick = () => {

            const inputs = alertMessage.querySelectorAll("input, textarea");
            const values = {};

            inputs.forEach(input => {
                values[input.id] = input.value;
            });

            if (onConfirm) {
                const shouldClose = onConfirm(values);

                if (shouldClose === false) return;
            }

            hideAlertAnimation(alertOverlay);
        };

        alertButtons.appendChild(btnConfirm);

        if (cancelText) {
            const btnCancel = document.createElement("button");
            btnCancel.className = "alert-btn alert-btn-cancel";
            btnCancel.textContent = cancelText;

            btnCancel.onclick = () => {
                hideAlertAnimation(alertOverlay, () => {
                    if (onCancel) onCancel();
                });
            };

            alertButtons.appendChild(btnCancel);
        }

        showAlertAnimation(alertOverlay);
    }

    window.showAlert = showAlert;
});
