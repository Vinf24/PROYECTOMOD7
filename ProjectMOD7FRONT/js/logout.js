document.getElementById("logoutBtn").addEventListener("click", async () => {
    try {
        await fetch("http://localhost:8000/auth/logout/", {
            method: "POST",
            credentials: "include"
        });
    } catch (e) {
        console.error(e);
    }

    localStorage.clear();
    window.location.href = "login.html";
});
