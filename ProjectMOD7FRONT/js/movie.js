document.addEventListener("DOMContentLoaded", async () => {

    const reviewSection = document.getElementById("reviewSection");
    let currentUserId = null;

    reviewSection.style.display = "none";

    async function checkSession() {
        try {
            const response = await fetch("http://localhost:8000/auth/check-session/", {
                credentials: "include"
            });

            if (response.ok) {
                const data = await response.json();
                currentUserId = data.user.id;
                reviewSection.style.display = "block";
            } else {
                reviewSection.style.display = "none";
            }

        } catch {
            reviewSection.style.display = "none";
        }
    }

    const params = new URLSearchParams(window.location.search);
    const movieId = params.get("id");

    const movieDetail = document.getElementById("movieDetail");
    const reviewsContainer = document.getElementById("reviewsContainer");

    async function loadMovie() {

        const response = await fetch(`http://localhost:8000/movies/${movieId}/`, {
            credentials: "include"
        });
        const movie = await response.json();
        console.log(movie);

        if (movie.user_review) {
            const r = movie.user_review;

            reviewSection.innerHTML = `
        <div class="card p-3">
            <h5 class="card-title">Tu reseña</h5>
            <p>⭐ ${r.rating}</p>
            <p>${r.comment}</p>
            <div class="d-flex gap-2">
                <button id="editReviewBtn" class="btn btn-sm btn-primary">Editar</button>
                <button id="deleteReviewBtn" class="btn btn-sm btn-danger">Eliminar</button>
            </div>
        </div>
        `;

            document.getElementById("editReviewBtn").addEventListener("click", () => {
                showAlert({
                    type: "info",
                    title: "Editar reseña",
                    html: `
                        <input id="editRating" type="number" class="form-control mb-2" value="${r.rating}" placeholder="Nota (1-10)">
                        <textarea id="editComment" class="form-control" placeholder="Comentario">${r.comment}</textarea>
                    `,
                    confirmText: "Guardar",
                    cancelText: "Cancelar",
                    onConfirm: async (values) => {

                        const rating = values.editRating;
                        const comment = values.editComment;

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
                            showAlert({ type: "success", message: "Reseña actualizada" });
                            loadMovie();
                        } else {
                            showAlert({ type: "danger", message: "Error al actualizar" });
                            return false;
                        }
                    }
                });
            });

            document.getElementById("deleteReviewBtn").addEventListener("click", async () => {
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
                            loadMovie();
                        }
                    }
                });
            });
        }

        else {
            reviewSection.innerHTML = `
                <h5>Agregar reseña</h5>
                <input type="number" id="rating" class="form-control mb-2" placeholder="Nota (1-10)">
                <textarea id="comment" class="form-control mb-2" placeholder="Comentario"></textarea>
                <button id="submitReview" class="btn btn-primary w-100">Enviar</button>
            `;

            const submitBtn = document.getElementById("submitReview");

            if (submitBtn) {
                submitBtn.addEventListener("click", async () => {
                    const rating = document.getElementById("rating").value;
                    const comment = document.getElementById("comment").value;

                    if (!rating || rating < 1 || rating > 10) {
                        showAlert({ type: "danger", message: "La nota debe ser entre 1 y 10" });
                        return;
                    }

                    if (!comment.trim()) {
                        showAlert({ type: "danger", message: "El comentario no puede estar vacío" });
                        return;
                    }

                    try {
                        const response = await fetch(`http://localhost:8000/movies/${movieId}/reviews/`, {
                            method: "POST",
                            credentials: "include",
                            headers: {
                                "Content-Type": "application/json",
                                "X-CSRFToken": getCookie("csrftoken")
                            },
                            body: JSON.stringify({ rating, comment })
                        });

                        const data = await response.json();

                        if (response.status === 401) {
                            showAlert({
                                type: "danger",
                                message: "Debes iniciar sesión para reseñar"
                            });
                            return;
                        }

                        if (!response.ok) {
                            showAlert({
                                type: "danger",
                                message: data.error || "Error al crear reseña"
                            });
                            return;
                        }

                        showAlert({ type: "success", message: "Reseña creada" });
                        document.getElementById("rating").value = "";
                        document.getElementById("comment").value = "";
                        loadMovie();

                    } catch (error) {
                        console.error(error);
                    }
                });
            }
        }

        const posterUrl = movie.poster_url;

        movieDetail.innerHTML = `
    <h1 class="display-5 fw-bold my-3">${movie.title}</h1>
    <img src="${posterUrl}" width="200">
    <p class="text-detail mt-2">${movie.description}</p>
    <p class="fs-4 fw-semibold">⭐ ${movie.average_rating ?? 'Sin notas'}</p>
`;

        reviewsContainer.innerHTML = "";

        movie.reviews.forEach(r => {
            const div = document.createElement("div");
            div.classList.add("card", "mb-2", "p-2");

            div.innerHTML = `
        <div class="d-flex justify-content-between">
            <strong style="cursor:pointer; color:blue;">
                ${r.alias}
            </strong>
            <span>⭐ ${r.rating}</span>
        </div>
        <p class="mb-0">${r.comment}</p>
        `;

            div.querySelector("strong").addEventListener("click", () => {
                window.location.href = `profile.html?id=${r.user_id}`;
            });

            reviewsContainer.appendChild(div);
        });
    }

    await checkSession();
    await loadMovie();

});