document.getElementById("logoutBtn").addEventListener("click", async () => {

    await fetch("http://localhost:8000/auth/logout/", {
        method: "POST",
        headers: {
        },
        credentials: "include"
    });

    window.location.href = "login.html";
});