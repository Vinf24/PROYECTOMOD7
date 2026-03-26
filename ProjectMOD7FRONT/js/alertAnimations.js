function showAlert(element, duration = 0) {
    if (!element) return;

    if (element._alertTimeout) {
        clearTimeout(element._alertTimeout);
        element._alertTimeout = null;
    }

    element.style.display = "flex";

    const content = element.firstElementChild;
    if (!content) return;

    content.classList.remove("alert-exiting");

    // Forzar reflow
    void content.offsetWidth;

    content.classList.add("alert-entering");

    content.addEventListener("animationend", () => {
        content.classList.remove("alert-entering");
    }, { once: true });

    if (duration > 0) {
        element._alertTimeout = setTimeout(() => {
            hideAlert(element);
        }, duration);
    }
}

function hideAlert(element, callback) {
    if (!element) return;

    if (element._alertTimeout) {
        clearTimeout(element._alertTimeout);
        element._alertTimeout = null;
    }

    const content = element.firstElementChild;

    if (!content) {
        element.style.display = "none";
        if (callback) callback();
        return;
    }

    content.classList.add("alert-exiting");

    content.addEventListener("animationend", () => {
        content.classList.remove("alert-exiting", "alert-entering");
        element.style.display = "none";
        if (callback) callback();
    }, { once: true });
}

function toggleAlert(element) {
    if (!element) return;

    if (element.style.display === "none" || !element.style.display) {
        showAlert(element);
    } else {
        hideAlert(element);
    }
}