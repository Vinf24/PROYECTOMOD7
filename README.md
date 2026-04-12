# Proyecto de Autenticación + Peliculas con Reseñas (Django + Docker)

Este proyecto es una API REST construida con Django + Django REST Framework, que incluye:

-	Sistema de autenticación con sesiones
-	Login con MFA (código de 6 dígitos)
-	Gestión de usuarios
-	CRUD de películas
-	Sistema de reseñas por usuario
-	Backend dockerizado con MySQL

---

## Tecnologias utilizadas

- Django
- Django REST Framework
- MySQL
- Docker y Docker Compose
- JavaScript (frontend desacoplado)

---

# Instalación

## Requisitos

Antes de comenzar, asegúrate de tener instalado:

- Docker y Docker Compose (Docker Desktop si es Windows)
- Git

---

## Clonar el repositorio

```bash
git clone https://github.com/Vinf24/PROYECTOMOD7.git
```

La carpeta central es /PROYECTOMOD7/

Es necesario entender que backend y frontend, deben desplegarse desde
sus respectivas carpetas padre.

---

## Levantar el backend del proyecto en Docker

Desde la carpeta /PROYECTOMOD7/

Necesario ir a la carpeta padre del backend (Donde se ubica manage.py)

```bash
cd ProjectMOD7BACK
cd auth6_project
```

Levantar contenedor

```bash
docker compose up --build
```

O en segundo plano

```bash
docker compose up -d --build
```

## Aplicar migraciones

```bash
docker compose exec pauth6-api python manage.py migrate
```

## Crear superusuario

```bash
docker compose exec pauth6-api python manage.py createsuperuser
```

---

## Levantar el frontend del proyecto en Live Server

Desde la carpeta /PROYECTOMOD7/

Es necesario llegar a la carpeta padre del frontend

```bash
cd ProjectMOD7FRONT
```

Una vez ahi con click derecho en algún html del proyecto
- Open with Live Server

---

# Acceso

- API: http://localhost:8000
- Admin: http://localhost:8000/admin

---

# Autenticación

El sistema usa cookies de sesión + CSRF (no tokens, planteamiento futuro)

---

## Registrar usuario

POST: http://localhost:8000/auth/register/

JSON:
```json
{
  "names": "Prueba",
  "lastnames": "Apis",
  "email": "test@test.com",
  "password": "12345678"
}
```

respuesta esperada:
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "names": "Prueba",
    "lastnames": "Apis",
    "email": "test@test.com"
  }
}
```

## Login usuario

POST: http://localhost:8000/auth/login/

JSON:
```json
{
  "email": "test@test.com",
  "password": "12345678"
}
```

respuesta esperada:
```json
{
  "message": "Login successful",
  "mfa_required": false,
  "user": { ... }
}
```

---

Para usar MFA, primero debe activarse

# Activar MFA 

---

## Desde la terminal:

```bash
docker compose exec pauth6-api python manage.py shell
```

```python
>>> from user_auth.models import CustomUser
>>> user = CustomUser.objects.get(email="test@test.com")
>>> user.mfa_required = True
>>> user.save()
```

---

respuesta con mfa activado:
```json
{
  "message": "MFA required",
  "challenge_id": "uuid-aqui"
}
```

En la terminal llega una simulación del correo electrónico

```text
Content-Type: multipart/alternative;
Subject: Your MFA Code
From: noreply@tuapp.com
To: test@test.com
Date: Sun, 22 Mar 2026 12:34:56 -0400

Hello Prueba,

Your MFA code is: 483921

This code will expire in 5 minutes.
------------------------------------------------------------

<html>
    <body>
        <p>Hello Prueba,</p>
        <p>Your MFA code is: <strong>483921</strong></p>
        <p>This code will expire in 5 minutes.</p>
    </body>
</html>
```

# Utilizar MFA

## Login con MFA

POST: http://localhost:8000/auth/verify-mfa/

JSON:
```json
{
  "challenge_id": "uuid-aqui",
  "code": "483921"
}
```

respuesta esperada:
```json
{
  "message": "MFA verification successful",
  "user": {
    "id": 1,
    "email": "test@test.com"
  }
}
```

---

## Reenviar código MFA

POST /auth/resend-mfa/

```json
{
  "challenge_id": "uuid"
}
```

---

## Verificar sesión

GET /auth/check-session/

Respuesta:
```json
{
  "authenticated": true,
  "user": {
    "id": 1,
    "email": "test@test.com"
  }
}
```

---

## Logout

POST /auth/logout/

---

# Módulo de Peliculas

## Listar peliculas

GET /movies/

Parámetros opcionales:
-	search → buscar por título
-	order:
  -	mejor_valoradas
  -	mas_reseñadas
  -	orden_alfabético
-	page

Ejemplo:
/movies/?search=batman&order=mejor_valoradas&page=1

Respuesta:
```json
{
  "results": [
    {
      "id": 1,
      "title": "Batman",
      "poster_url": "/media/posters/batman.jpg",
      "average_rating": 8.5
    }
  ],
  "total_pages": 5,
  "current_page": 1
}
```

---

## Detalle de película

GET /movies/{id}/

Respuesta:
```json
{
  "id": 1,
  "title": "Batman",
  "description": "Película...",
  "poster_url": "http://localhost:8000/media/posters/batman.jpg",
  "average_rating": 8.5,
  "reviews": [...],
  "user_review": {...}
}
```

---

# Sistema de Reseñas

## Crear Reseña

POST /movies/{id}/reviews/

```json
{
  "rating": 9,
  "comment": "Excelente película"
}
```

---

## Editar Reseña

PATCH /movies/reviews/{review_id}/

```json
{
  "rating": 8,
  "comment": "Cambio de opinión"
}
```

---

## Eliminar Reseña

DELETE /movies/reviews/{review_id}/delete/

---

## Reglas

- Se pueden revisar películas, pero no reseñar sin estar autentificado
- Además se verá un listado de las reseñas de otros usuarios
- Al estar autentificado, solo podrá crear una reseña por película
  - Si no tiene reseña, verá un formulario para añadirla
  - Si ya tiene, la verá junto con las opciones:
    - Eliminar
    - Editar

---

# Imágenes ( Posters)

Las imágenes se almacenan en:

/media/posters/

Ejemplo:
http://localhost:8000/media/posters/batman.jpg

Si una película no tiene imagen:

/img/posters/default.png

---

## Conexión a la base de datos (MySQL)

El proyecto utiliza MySQL como base de datos, levantada mediante Docker.

### Configuración en Docker

El servicio de base de datos expone el puerto:

- Host: `localhost`
- Puerto: `3307` (mapeado desde el contenedor)
- Base de datos: (definida en docker-compose)
- Usuario: (definido en docker-compose)
- Password: (definido en docker-compose)

---

**Datos de conexión:**

- Host: `localhost`
- Port: `3307`
- User: `root` (o el definido en tu docker-compose)
- Password: (la definida en docker-compose)
- Database: (nombre de la base de datos)

---

# Funciones clave

-	Autenticación con sesiones
-	Protección CSRF
-	MFA con expiración
-	Reenvío de códigos
-	Relación Usuario, Pelicula a través de Reseñas
-	Cálculo de notas promedio dinámico
-	Filtros y ordenamiento
-	Paginación
-	Manejo de imágenes desde backend

---
