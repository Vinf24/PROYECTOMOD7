# Proyecto de Autenticación con MFA (Django + Docker)

Este proyecto implementa un sistema de autenticación con **login + MFA (código de 6 dígitos)** usando Django REST Framework.

---

## Requisitos

Antes de comenzar, asegúrate de tener instalado:

- Docker y Docker Compose (Docker Desktop si es Windows)
- Git

---

## Clonar el repositorio

```bash
git clone https://github.com/Vinf24/auth6_project.git
cd auth6_project
```

## Levantar el proyecto en Docker

```bash
docker compose up --build
```

O en segundo plano

```bash
docker compose up -d --build
```

## Aplicar migraciones

```bash
docker compose exec pauth6-api python auth6_project/manage.py migrate
```

## Crear superusuario

```bash
docker compose exec pauth6-api python manage.py createsuperuser
```

---

## Acceso

- API: http://localhost:8000
- Admin: http://localhost:8000/admin

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

## Activar MFA desde la terminal:

```bash
docker compose exec pauth6-api python manage.py shell
```

```python
>>> from user_auth.models import CustomUser
>>> user = CustomUser.objects.get(email="test@test.com")
>>> user.mfa_required = True
>>> user.save()
```

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

## Utilizar MFA

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