document.addEventListener("DOMContentLoaded", async () => {

    const loginBtn = document.getElementById("loginBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const perfilBtn = document.getElementById("perfilBtn");
    const cuentaBtn = document.getElementById("cuentaBtn");
    const movieList = document.getElementById("movieList");
    const searchInput = document.getElementById("searchInput");

    const prevBtn = document.getElementById("prevPage");
    const nextBtn = document.getElementById("nextPage");
    const pageInfo = document.getElementById("pageInfo");

    let currentSearch = "";
    let searchTimeout;
    let currentPage = 1;
    let totalPages = 1;

    function showLoggedOut() {
        loginBtn.classList.remove("d-none");

        perfilBtn.classList.add("d-none");
        cuentaBtn.classList.add("d-none");
        logoutBtn.classList.add("d-none");
    }

    function showLoggedIn(user) {
        loginBtn.classList.add("d-none");

        perfilBtn.classList.remove("d-none");
        cuentaBtn.classList.remove("d-none");
        logoutBtn.classList.remove("d-none");

        if (user.is_staff && typeof showControlButton === "function") {
            showControlButton();
        }
    }

    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            if (currentPage > 1) {
                currentPage--;
                loadMovies();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            if (currentPage < totalPages) {
                currentPage++;
                loadMovies();
            }
        });
    }

    document.getElementById("filtroTipo").addEventListener("change", () => {
        currentPage = 1;
        loadMovies();
    });

    async function checkSession() {
        try {
            const response = await fetch("http://localhost:8000/auth/check-session/", {
                credentials: "include"
            });

            if (!response.ok) {
                showLoggedOut();
                return;
            }

            const data = await response.json();

            showLoggedIn(data.user);

        } catch (error) {
            console.error("Error sesión:", error);
            showLoggedOut();
        }
    }

    await checkSession();

    if (perfilBtn) {
        perfilBtn.addEventListener("click", () => {
            window.location.href = "profile.html";
        });
    }

    if (cuentaBtn) {
        cuentaBtn.addEventListener("click", () => {
            window.location.href = "cuenta.html";
        });
    }

    if (loginBtn) {
        loginBtn.addEventListener("click", () => {
            window.location.href = "login.html";
        });
    }

    async function loadMovies() {

        const filtro = document.getElementById("filtroTipo").value;

        let url = "http://localhost:8000/movies/";
        let params = [];

        if (filtro !== "Todas") {
            params.push(`order=${filtro}`);
        }

        if (currentSearch) {
            params.push(`search=${encodeURIComponent(currentSearch)}`);
        }

        params.push(`page=${currentPage}`);

        if (params.length > 0) {
            url += `?${params.join("&")}`;
        }

        movieList.innerHTML = `<p class="text-center">Cargando películas...</p>`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            const movies = data.results;
            totalPages = data.total_pages;
            currentPage = data.current_page;

            if (pageInfo) {
                pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
            }

            if (prevBtn) {
                prevBtn.disabled = currentPage <= 1;
            }

            if (nextBtn) {
                nextBtn.disabled = currentPage >= totalPages;
            }

            movieList.innerHTML = "";

            if (movies.length === 0) {
                movieList.innerHTML = `
                <div class="text-center text-light py-4">
                    🎬 No hay películas disponibles
                </div>
            `;
                return;
            }

            movies.forEach(movie => {

                const col = document.createElement("div");
                col.classList.add("col-12", "col-sm-6", "col-md-4");

                const posterUrl = movie.poster
                    ? `http://localhost:8000${movie.poster}`
                    : "";

                col.innerHTML = `
    <div class="card h-100 movie-card" style="cursor:pointer;">
        <img src="${posterUrl}" class="movie-img">
        <div class="card-detail">
            <h6 class="movie-title">${movie.title}</h6>
            <p class="movie-rating">⭐ ${movie.average_rating ?? 'Sin notas'}</p>
        </div>
    </div>
`;

                col.addEventListener("click", () => {
                    window.location.href = `movie.html?id=${movie.id}`;
                });

                movieList.appendChild(col);
            });

        } catch (error) {
            console.error("Error cargando películas:", error);

            movieList.innerHTML = `
                <li class="list-group-item text-danger text-center">
                    Error cargando películas
                </li>
            `;
        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    await loadMovies();

    if (searchInput) {
        searchInput.addEventListener("input", () => {

            clearTimeout(searchTimeout);

            searchTimeout = setTimeout(() => {
                currentSearch = searchInput.value;
                currentPage = 1;
                loadMovies();
            }, 400);
        });
    }
});
