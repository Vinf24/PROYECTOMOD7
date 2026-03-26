document.addEventListener("DOMContentLoaded", async () => {

    try {
        const response = await fetch("http://localhost:8000/auth/check-session/", {
            method: "GET",
            credentials: "include"
        });

        if (!response.ok) {
            window.location.href = "login.html";
            return;
        }

    } catch (error) {
        window.location.href = "login.html";
    }

});
