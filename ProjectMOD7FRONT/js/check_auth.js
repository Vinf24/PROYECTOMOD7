document.addEventListener("DOMContentLoaded", async () => {

    if (window.location.pathname.includes("login.html")) return;

    try {
        const response = await fetch("http://localhost:8000/auth/check-session/", {
            method: "GET",
            credentials: "include"
        });

        if (!response.ok) {
            window.location.href = "login.html";
            return;
        }

        const data = await response.json();

        if (!data.authenticated) {
            window.location.href = "login.html";
            return;
        }

    } catch (error) {
        window.location.href = "login.html";
    }

});
