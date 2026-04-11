document.addEventListener("DOMContentLoaded", async () => {

    const usersListBtn = document.getElementById("usersListBtn");
    const mainPageBtn = document.getElementById("mainPageBtn");
    const addMovieBtn = document.getElementById("addMovieBtn");

    let currentSearch = "";
    let currentPage = 1;
    let totalPages = 1;
    let searchTimeout;

    let editingMovieId = null;

    if (usersListBtn) {
        usersListBtn.addEventListener("click", () => {
            window.location.href = "users.html";
        });
    }

    if (mainPageBtn) {
        mainPageBtn.addEventListener("click", () => {
            window.location.href = "main.html";
        });
    }

    const user = JSON.parse(localStorage.getItem("user"));

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    if (!user.is_staff) {
        window.location.href = "main.html";
        return;
    }

    try {
        const response = await fetch("http://localhost:8000/auth/admin/panel/", {
            method: "GET",
            credentials: "include"
        });

        if (!response.ok) {
            localStorage.clear();
            window.location.href = "login.html";
            return;
        }

        const data = await response.json();
        console.log("ADMIN OK:", data);

    } catch (error) {
        console.error("Error:", error);
        window.location.href = "login.html";
    }

    const movieAdminList = document.getElementById("movieAdminList");

    async function loadMoviesAdmin() {

        let url = "http://localhost:8000/movies/";
        let params = [];

        if (currentSearch) {
            params.push(`search=${encodeURIComponent(currentSearch)}`);
        }

        params.push(`page=${currentPage}`);

        if (params.length > 0) {
            url += `?${params.join("&")}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        movieAdminList.innerHTML = "";

        totalPages = data.total_pages;
        currentPage = data.current_page;

        document.getElementById("pageInfo").textContent =
            `Página ${currentPage} de ${totalPages}`;

        document.getElementById("prevPage").disabled = currentPage <= 1;
        document.getElementById("nextPage").disabled = currentPage >= totalPages;

        data.results.forEach(movie => {

            const col = document.createElement("div");
            col.classList.add("col-12", "col-sm-6", "col-md-4");

            const posterUrl = movie.poster_url
                ? `http://localhost:8000${movie.poster}`
                : "img/posters/default.png";

            col.innerHTML = `
            <div class="card h-100 p-2">

                <img src="${posterUrl}" style="height:200px; object-fit:cover;">

                <div class="mt-2">
                    <h6>${movie.title}</h6>
                    <small>ID: ${movie.id}</small>
                </div>

                <div class="d-flex justify-content-end gap-2 mt-2">
                    <button class="btn btn-soft btn-sm" onclick="openEditModal(${movie.id})">✏️</button>
                    <button class="btn btn-outline-danger btn-sm" onclick="deleteMovie(${movie.id})">🗑️</button>
                </div>

            </div>
        `;

            movieAdminList.appendChild(col);
        });
    }

    window.loadMoviesAdmin = loadMoviesAdmin;

    async function createMovie(movieData) {

        const formData = new FormData();

        formData.append("title", movieData.title);
        formData.append("description", movieData.description);
        formData.append("release_date", movieData.release_date);

        if (movieData.poster) {
            formData.append("poster", movieData.poster);
        }

        const response = await fetch("http://localhost:8000/movies/create/", {
            method: "POST",
            credentials: "include",
            headers: {
                "X-CSRFToken": getCookie("csrftoken")
            },
            body: formData
        });

        if (response.ok) {
            loadMoviesAdmin();
            showAlert({
                type: "success",
                message: "Película creada"
            });
        } else {
            const err = await response.json();
            console.error("Error creando película:", err);

            showAlert({
                type: "danger",
                message: "Error al crear película"
            });
        }
    }

    document.getElementById("searchInput").addEventListener("input", () => {
        clearTimeout(searchTimeout);

        searchTimeout = setTimeout(() => {
            currentSearch = document.getElementById("searchInput").value;
            currentPage = 1;
            loadMoviesAdmin();
        }, 400);
    });

    document.getElementById("prevPage").addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            loadMoviesAdmin();
        }
    });

    document.getElementById("nextPage").addEventListener("click", () => {
        if (currentPage < totalPages) {
            currentPage++;
            loadMoviesAdmin();
        }
    });

    if (addMovieBtn) {

        const modal = new bootstrap.Modal(document.getElementById("movieModal"));

        addMovieBtn.addEventListener("click", () => {
            editingMovieId = null;

            document.getElementById("modalTitle").textContent = "Nueva Película";

            document.getElementById("movieTitle").value = "";
            document.getElementById("movieDescription").value = "";
            document.getElementById("movieDate").value = "";
            document.getElementById("moviePoster").value = "";
            document.getElementById("posterPreview").style.display = "none";

            modal.show();
        });

        const posterInput = document.getElementById("moviePoster");
        const preview = document.getElementById("posterPreview");

        posterInput.addEventListener("change", () => {
            const file = posterInput.files[0];

            if (file) {
                preview.src = URL.createObjectURL(file);
                preview.style.display = "block";
            }
        });

        const saveBtn = document.getElementById("saveMovieBtn");

        saveBtn.addEventListener("click", async () => {

            const title = document.getElementById("movieTitle").value;
            const description = document.getElementById("movieDescription").value;
            const release_date = document.getElementById("movieDate").value;
            const poster = posterInput.files[0];

            if (!title || !description || !release_date) {
                showAlert({
                    type: "danger",
                    message: "Completa todos los campos"
                });
                return;
            }

            if (editingMovieId) {
                await updateMovie(editingMovieId, { title, description, release_date, poster });
            } else {
                await createMovie({ title, description, release_date, poster });
            }

            modal.hide();

            document.getElementById("movieTitle").value = "";
            document.getElementById("movieDescription").value = "";
            document.getElementById("movieDate").value = "";
            posterInput.value = "";
            preview.style.display = "none";
        });
    }

    const saveEditMovieBtn = document.getElementById("saveEditMovieBtn");

    if (saveEditMovieBtn) {
        saveEditMovieBtn.addEventListener("click", async () => {

            const id = saveEditMovieBtn.dataset.id;

            const formData = new FormData();
            formData.append("title", document.getElementById("editTitle").value);
            formData.append("description", document.getElementById("editDescription").value);
            formData.append("release_date", document.getElementById("editReleaseDate").value);

            const file = document.getElementById("editPoster").files[0];
            if (file) {
                formData.append("poster", file);
            }

            const response = await fetch(`http://localhost:8000/movies/${id}/update/`, {
                method: "PATCH",
                credentials: "include",
                headers: {
                    "X-CSRFToken": getCookie("csrftoken")
                },
                body: formData
            });

            if (response.ok) {
                loadMoviesAdmin();

                const modalEl = document.getElementById("editMovieModal");
                const modal = bootstrap.Modal.getInstance(modalEl);
                modal.hide();
            } else {
                const err = await response.json();
                console.error("Error editando:", err);
            }

        });
    }

    loadMoviesAdmin();
});

async function editMovie(id) {

    editingMovieId = id;

    const modal = new bootstrap.Modal(document.getElementById("movieModal"));

    try {
        const response = await fetch(`http://localhost:8000/movies/${id}/`);
        const movie = await response.json();

        document.getElementById("modalTitle").textContent = "Editar Película";

        document.getElementById("movieTitle").value = movie.title;
        document.getElementById("movieDescription").value = movie.description;
        document.getElementById("movieDate").value = movie.release_date || "";

        const preview = document.getElementById("posterPreview");

        if (movie.poster) {
            preview.src = `http://localhost:8000${movie.poster}`;
            preview.style.display = "block";
        } else {
            preview.style.display = "none";
        }

        modal.show();

    } catch (error) {
        console.error("Error cargando película:", error);
    }
}

async function deleteMovie(id) {
    showAlert({
        type: "danger",
        title: "Eliminar película",
        message: "¿Estás seguro?",
        confirmText: "Eliminar",
        cancelText: "Cancelar",
        onConfirm: async () => {

            const response = await fetch(`http://localhost:8000/movies/${id}/delete/`, {
                method: "DELETE",
                credentials: "include",
                headers: {
                    "X-CSRFToken": getCookie("csrftoken")
                }
            });

            if (response.ok) {
                loadMoviesAdmin();
                showAlert({
                    type: "success",
                    message: "Película eliminada"
                });
            } else {
                showAlert({
                    type: "danger",
                    message: "Error al eliminar"
                });
            }
        }
    });

    if (response.ok) {
        loadMoviesAdmin();
    }
}

async function updateMovie(id, movieData) {

    const formData = new FormData();

    formData.append("title", movieData.title);
    formData.append("description", movieData.description);
    formData.append("release_date", movieData.release_date);

    if (movieData.poster) {
        formData.append("poster", movieData.poster);
    }

    const response = await fetch(`http://localhost:8000/movies/${id}/update/`, {
        method: "PATCH",
        credentials: "include",
        headers: {
            "X-CSRFToken": getCookie("csrftoken")
        },
        body: formData
    });

    if (response.ok) {
        loadMoviesAdmin();
        showAlert({
            type: "success",
            message: "Película actualizada"
        });
    } else {
        const err = await response.json();
        console.error("Error actualizando:", err);

        showAlert({
            type: "danger",
            message: "Error al actualizar"
        });
    }
}

async function openEditModal(id) {

    const response = await fetch(`http://localhost:8000/movies/${id}/`);
    const movie = await response.json();

    document.getElementById("editTitle").value = movie.title;
    document.getElementById("editDescription").value = movie.description;
    document.getElementById("editReleaseDate").value = movie.release_date || "";

    const posterUrl = movie.poster
        ? `http://localhost:8000${movie.poster}`
        : "https://via.placeholder.com/300x450?text=Sin+imagen";

    document.getElementById("currentPoster").src = posterUrl;

    const saveBtn = document.getElementById("saveEditMovieBtn");
    saveBtn.dataset.id = id;

    const modal = new bootstrap.Modal(document.getElementById("editMovieModal"));
    modal.show();
}

window.editMovie = editMovie;
window.deleteMovie = deleteMovie;
