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

        if (data.profile_image) {
            profileImage.src = `http://localhost:8000${data.profile_image}`;
        }

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

        profileImage.src = originalImage || "http://localhost:8000/media/profiles/default.png";

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

    async function loadMyReviews() {
        const container = document.getElementById("myReviewsContainer");

        try {
            const response = await fetch("http://localhost:8000/movies/my-reviews/", {
                credentials: "include"
            });

            if (!response.ok) return;

            const reviews = await response.json();

            container.innerHTML = "";

            if (reviews.length === 0) {
                container.innerHTML = "<p class='text-light'>No has hecho reseñas</p>";
                return;
            }

            reviews.forEach(r => {
                const div = document.createElement("div");
                div.classList.add("review-card", "p-2", "mb-2");

                div.innerHTML = `
                <h6 class="clickable-user">
                    🎬 ${r.movie_title}
                </h6>
                <p class="review-text">⭐ ${r.rating} - ${r.comment}</p>
                <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-outline-info edit-btn">Editar</button>
                    <button class="btn btn-sm btn-danger delete-btn">Eliminar</button>
                </div>
            `;

                div.querySelector("h6").addEventListener("click", () => {
                    window.location.href = `movie.html?id=${r.movie_id}`;
                });

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
                                loadMyReviews();
                            }
                        }
                    });
                });

                div.querySelector(".edit-btn").addEventListener("click", async () => {

                    showAlert({
                        type: "info",
                        title: "Editar reseña",
                        html: `
                            <input id="rating" type="number" class="form-control mb-2" value="${r.rating}" placeholder="Nota (1-10)">
                            <textarea id="comment" class="form-control">${r.comment}</textarea>
                        `,
                        confirmText: "Guardar",
                        cancelText: "Cancelar",
                        onConfirm: async ({ rating, comment }) => {

                            if (!rating || rating < 1 || rating > 10) {
                                showAlert({ type: "danger", message: "Nota inválida" });
                                return false;
                            }

                            if (!comment.trim()) {
                                showAlert({ type: "danger", message: "Comentario vacío" });
                                return false;
                            }

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
                                loadMyReviews();
                            }
                        }
                    });

                    if (resp.ok) {
                        loadMyReviews();
                    }
                });

                container.appendChild(div);
            });

        } catch (error) {
            console.error(error);
        }
    }

    async function loadUserReviews(userId) {
        const container = document.getElementById("myReviewsContainer");

        try {
            const response = await fetch(`http://localhost:8000/movies/user/${userId}/reviews/`);
            const reviews = await response.json();

            container.innerHTML = "";

            if (reviews.length === 0) {
                container.innerHTML = "<p class='text-light'>No hay reseñas</p>";
                return;
            }

            reviews.forEach(r => {
                const div = document.createElement("div");
                div.classList.add("card", "p-2", "mb-2");

                div.innerHTML = `
                <div class="d-flex justify-content-between">
                    <strong>${r.movie_title}</strong>
                    <span>⭐ ${r.rating}</span>
                </div>
                <p>${r.comment}</p>
            `;

                div.addEventListener("click", () => {
                    window.location.href = `movie.html?id=${r.movie_id}`;
                });

                container.appendChild(div);
            });

        } catch (error) {
            console.error(error);
        }
    }

    if (userId) {
        editBtn.classList.add("d-none");
        cancelBtn.classList.add("d-none");
        imageInput.classList.add("d-none");

        await loadUserReviews(userId);

    } else {
        await loadMyReviews();
    }

});
