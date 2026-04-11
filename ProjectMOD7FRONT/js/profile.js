document.addEventListener("DOMContentLoaded", async () => {

    let originalAlias = "";
    let originalBio = "";
    let originalImage = "";

    const params = new URLSearchParams(window.location.search);
    const userId = params.get("id");

    const aliasEl = document.getElementById("alias");
    const bioEl = document.getElementById("bio");
    const profileImage = document.getElementById("profileImage");
    const editBtn = document.getElementById("editProfileBtn");
    const imageInput = document.getElementById("imageInput");
    const cancelBtn = document.getElementById("cancelEditBtn");

    let editMode = false;
    let currentProfile = {};

    let currentPage = 1;
    let totalPages = 1;
    let currentSearch = "";
    let searchTimeout;

    try {
        const resp = await fetch("http://localhost:8000/auth/check-session/", {
            method: "GET",
            credentials: "include"
        });
        const sess = await resp.json();
        if (sess.authenticated && !userId) {
            editBtn.classList.remove("d-none");
        }
    } catch { }

    try {
        let url;

        if (userId) {
            url = `http://localhost:8000/users/${userId}/`;
        } else {
            url = "http://localhost:8000/auth/profile/";
        }

        const response = await fetch(url, {
            method: "GET",
            credentials: "include"
        });

        const data = await response.json();
        if (!response.ok) throw new Error("Error cargando perfil");

        currentProfile = data;

        aliasEl.innerText = data.alias || "Sin alias";
        bioEl.innerText = data.bio || "Sin descripción";

        profileImage.src = data.profile_image
            ? `http://localhost:8000${data.profile_image}`
            : "img/profiles/default.png";

    } catch (error) {
        console.error(error);
        showAlert({ type: "danger", message: "Debes iniciar sesión" });
        setTimeout(() => window.location.href = "login.html", 1500);
    }

    editBtn.addEventListener("click", async () => {

        if (!editMode) {
            originalAlias = aliasEl.textContent;
            originalBio = bioEl.textContent;
            originalImage = profileImage.src;

            aliasEl.innerHTML = `<input id="aliasInput" class="form-control mb-2" value="${originalAlias}">`;
            bioEl.innerHTML = `<textarea id="bioInput" class="form-control">${originalBio}</textarea>`;

            imageInput.classList.remove("d-none");
            cancelBtn.classList.remove("d-none");

            editBtn.textContent = "Guardar";
            editMode = true;

        } else {
            const alias = document.getElementById("aliasInput").value;
            const bio = document.getElementById("bioInput").value;
            const imageFile = imageInput.files[0];

            const formData = new FormData();
            formData.append("alias", alias);
            formData.append("bio", bio);
            if (imageFile) formData.append("profile_image", imageFile);

            try {
                const resp = await fetch("http://localhost:8000/auth/profile/", {
                    method: "PATCH",
                    credentials: "include",
                    headers: {
                        "X-CSRFToken": getCookie("csrftoken")
                    },
                    body: formData
                });

                if (!resp.ok) throw new Error();

                showAlert({ type: "success", message: "Perfil actualizado" });

                if (imageFile) {
                    const newSrc = URL.createObjectURL(imageFile);
                    profileImage.src = newSrc;
                } else if (currentProfile.profile_image) {
                    profileImage.src = `http://localhost:8000${currentProfile.profile_image}`;
                }

                aliasEl.innerText = alias;
                bioEl.innerText = bio;
                imageInput.classList.add("d-none");
                editBtn.textContent = "Editar perfil";
                cancelBtn.classList.add("d-none");
                currentProfile.alias = alias;
                currentProfile.bio = bio;
                if (imageFile) {
                    currentProfile.profile_image = profileImage.src.includes("blob:")
                        ? currentProfile.profile_image
                        : profileImage.src.replace("http://localhost:8000", "");
                }
                editMode = false;

            } catch (error) {
                console.error(error);
                showAlert({ type: "danger", message: "Error al actualizar" });
            }
        }
    });

    cancelBtn.addEventListener("click", () => {

        aliasEl.innerText = originalAlias || "Sin alias";
        bioEl.innerText = originalBio || "Sin descripción";

        profileImage.src = originalImage || "img/profiles/default.png";

        imageInput.value = "";
        imageInput.classList.add("d-none");

        editBtn.textContent = "Editar perfil";
        cancelBtn.classList.add("d-none");

        editMode = false;
    });

    imageInput.addEventListener("change", () => {
        const file = imageInput.files[0];
        if (file) {
            profileImage.src = URL.createObjectURL(file);
        }
    });

    async function loadReviews() {

        const container = document.getElementById("myReviewsContainer");

        let url = "http://localhost:8000/movies/reviews/";
        let params = [];

        if (userId) {
            params.push(`user_id=${userId}`);
        }

        if (!userId) {
            const user = JSON.parse(localStorage.getItem("user"));
            if (user) {
                params.push(`user_id=${user.id}`);
            }
        }

        if (currentSearch) {
            params.push(`search=${encodeURIComponent(currentSearch)}`);
        }

        params.push(`page=${currentPage}`);

        if (params.length > 0) {
            url += `?${params.join("&")}`;
        }

        try {
            const response = await fetch(url, {
                credentials: "include"
            });

            const data = await response.json();

            container.innerHTML = "";

            totalPages = data.total_pages;
            currentPage = data.current_page;

            document.getElementById("reviewsPageInfo").textContent =
                `Página ${currentPage} de ${totalPages}`;

            document.getElementById("prevReviews").disabled = currentPage <= 1;
            document.getElementById("nextReviews").disabled = currentPage >= totalPages;

            if (data.results.length === 0) {
                container.innerHTML = "<p class='text-light'>No hay reseñas</p>";
                return;
            }

            data.results.forEach(r => {

                const div = document.createElement("div");
                div.classList.add("card", "p-2", "mb-2");

                div.innerHTML = `
                <div class="d-flex justify-content-between">
                    <h6 class="link-profile">🎬 ${r.movie_title}</h6>
                    <span>${!userId ? `
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-primary edit-btn">✏️</button>
                        <button class="btn btn-sm btn-outline-danger delete-btn">🗑️</button>
                    </div>
                ` : ""}</span>
                </div>

                <p class="mb-2">⭐ ${r.rating} - ${r.comment}</p>
            `;

                div.querySelector("h6").addEventListener("click", () => {
                    window.location.href = `movie.html?id=${r.movie_id}`;
                });

                if (!userId) {
                    div.querySelector(".delete-btn").addEventListener("click", async () => {
                        showAlert({
                            type: "danger",
                            title: "Eliminar reseña",
                            message: "¿Estás seguro?",
                            confirmText: "Eliminar",
                            cancelText: "Cancelar",
                            onConfirm: async () => {

                                const resp = await fetch(`http://localhost:8000/movies/reviews/${r.id}/delete/`, {
                                    method: "DELETE",
                                    credentials: "include",
                                    headers: {
                                        "X-CSRFToken": getCookie("csrftoken")
                                    }
                                });

                                if (resp.ok) {
                                    loadReviews();
                                }
                            }
                        });
                    });

                    div.querySelector(".edit-btn").addEventListener("click", async () => {

                        showAlert({
                            type: "info",
                            title: "Editar reseña",
                            html: `
                            <input id="rating" type="number" class="form-control mb-2" value="${r.rating}">
                            <textarea id="comment" class="form-control">${r.comment}</textarea>
                        `,
                            confirmText: "Guardar",
                            cancelText: "Cancelar",
                            onConfirm: async ({ rating, comment }) => {

                                const resp = await fetch(`http://localhost:8000/movies/reviews/${r.id}/`, {
                                    method: "PATCH",
                                    credentials: "include",
                                    headers: {
                                        "Content-Type": "application/json",
                                        "X-CSRFToken": getCookie("csrftoken")
                                    },
                                    body: JSON.stringify({ rating, comment })
                                });

                                if (resp.ok) {
                                    loadReviews();
                                }
                            }
                        });
                    });
                }

                container.appendChild(div);
            });

        } catch (error) {
            console.error(error);
        }
    }

    document.getElementById("searchReviews").addEventListener("input", () => {
        clearTimeout(searchTimeout);

        searchTimeout = setTimeout(() => {
            currentSearch = document.getElementById("searchReviews").value;
            currentPage = 1;
            loadReviews();
        }, 400);
    });

    document.getElementById("prevReviews").addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            loadReviews();
        }
    });

    document.getElementById("nextReviews").addEventListener("click", () => {
        if (currentPage < totalPages) {
            currentPage++;
            loadReviews();
        }
    });

    if (userId) {
        editBtn.classList.add("d-none");
        cancelBtn.classList.add("d-none");
        imageInput.classList.add("d-none");
    }

    await loadReviews();

});
