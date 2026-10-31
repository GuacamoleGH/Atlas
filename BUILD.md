# 🛠️ Guía de Compilación, Despliegue y Self-Hosting de Atlas

Esta guía detalla los pasos para compilar, configurar y desplegar **Atlas** en un servidor local o VPS propio (Self-Hosted) con base de datos **PostgreSQL**, ejecutándose bajo el dominio de producción **[https://atlas.guacamolegh.es](https://atlas.guacamolegh.es)**.

---

## 📋 Requisitos Previos

- **Sistema Operativo:** Linux (Ubuntu 22.04 / 24.04 LTS recomendado) o Windows Server.
- **Node.js:** Versión 18.x o 20.x LTS.
- **Base de Datos:** PostgreSQL 14 o superior instalado y en ejecución.
- **Gestor de Procesos:** [PM2](https://pm2.keymetrics.io/) o servicio de `systemd`.
- **Proxy Inverso:** Nginx, Caddy o Cloudflare Tunnel para gestión de SSL (HTTPS).

---

## 🗄️ 1. Configuración de PostgreSQL

Accede a tu consola de PostgreSQL en el servidor:

```bash
sudo -u postgres psql
```

Crea el usuario y la base de datos para Atlas:

```sql
CREATE USER atlas_user WITH ENCRYPTED PASSWORD 'tu_contrasena_segura';
CREATE DATABASE atlas OWNER atlas_user;
GRANT ALL PRIVILEGES ON DATABASE atlas TO atlas_user;
\q
```

---

## ⚙️ 2. Variables de Entorno (`.env`)

Crea un archivo `.env` en la raíz del proyecto basándote en `.env.example`:

```bash
cp .env.example .env
nano .env
```

### Contenido recomendado para producción:

```env
# ==========================================
# 🗄️ POSTGRESQL (Servidor Local)
# ==========================================
DATABASE_URL="postgresql://atlas_user:tu_contrasena_segura@localhost:5432/atlas?schema=public"
DIRECT_URL="postgresql://atlas_user:tu_contrasena_segura@localhost:5432/atlas?schema=public"

# ==========================================
# 🔐 NEXTAUTH & DOMINIO OFICIAL
# ==========================================
# Genera una clave aleatoria de 32 bytes con: openssl rand -base64 32
NEXTAUTH_SECRET="tu_secreto_generado_de_32_o_mas_caracteres"
NEXTAUTH_URL="https://atlas.guacamolegh.es"

# ==========================================
# 🎬 APIS EXTERNAS
# ==========================================
TMDB_API_KEY="tu_tmdb_api_key"
TMDB_READ_ACCESS_TOKEN="tu_tmdb_read_token"
RAWG_API_KEY="tu_rawg_api_key"
OMDB_API_KEY=""

# ==========================================
# 👥 OAUTH PROVIDERS (Opcional)
# ==========================================
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
DISCORD_CLIENT_ID=""
DISCORD_CLIENT_SECRET=""
```

---

## 📦 3. Instalación y Preparación de la Base de Datos

Instala las dependencias y sincroniza el esquema con PostgreSQL:

```bash
# 1. Instalar paquetes de Node
npm install

# 2. Generar el cliente de Prisma
npx prisma generate

# 3. Aplicar las tablas en tu base de datos PostgreSQL
npm run db:push

# 4. (Opcional) Sembrar catálogo inicial verificado de Cine y Videojuegos
npm run db:seed:all
```

---

## 🏗️ 4. Compilación del Proyecto (Build)

Ejecuta el build de producción optimizado de Next.js:

```bash
npm run build
```

Una vez completado con éxito, la carpeta `.next/` contendrá los assets estáticos y las rutas del servidor optimizadas.

Para verificar que arranca correctamente en local:

```bash
npm run start
```
*(Por defecto se levantará en `http://localhost:3000`)*.

---

## 🔄 5. Gestión del Servicio en Producción

### Opción A: Usando PM2 (Recomendado)

Instala PM2 de forma global si aún no lo tienes:

```bash
npm install -g pm2
```

Inicia la aplicación Atlas:

```bash
# Iniciar servicio en el puerto 3000
pm2 start npm --name "atlas" -- start -- -p 3000

# Configurar inicio automático al reiniciar el servidor
pm2 save
pm2 startup
```

Comandos útiles de PM2:
- `pm2 logs atlas` — Ver logs en tiempo real.
- `pm2 status` — Estado y uso de memoria/CPU.
- `pm2 restart atlas` — Reiniciar servicio.

---

### Opción B: Usando Systemd

Crea el archivo de servicio en `/etc/systemd/system/atlas.service`:

```ini
[Unit]
Description=Atlas Entertainment Hub
After=network.target postgresql.service

[Service]
Type=simple
User=usuario_servidor
WorkingDirectory=/ruta/a/Atlas
ExecStart=/usr/bin/npm run start -- -p 3000
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

Habilita y arranca el servicio:

```bash
sudo systemctl daemon-reload
sudo systemctl enable atlas
sudo systemctl start atlas
```

---

## 🌐 6. Configuración de Proxy Inverso (Nginx & SSL)

Para que tu servidor responda públicamente en **`https://atlas.guacamolegh.es`**, configura un bloque de servidor en Nginx:

```nginx
server {
    server_name atlas.guacamolegh.es;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activa el certificado SSL gratuito con Certbot:

```bash
sudo certbot --nginx -d atlas.guacamolegh.es
```

---

## 🚀 7. Flujo para Actualizar Versiones en el Servidor

Cuando subas cambios a GitHub y quieras desplegarlos en tu servidor:

```bash
cd /ruta/a/Atlas
git pull origin main
npm install
npx prisma generate
npm run db:push
npm run build
pm2 restart atlas
```

---

## 🩹 Solución de Problemas Comunes

1. **Error de conexión a PostgreSQL (`P1001: Can't reach database server`):**
   - Asegúrate de que el servicio está activo: `sudo systemctl status postgresql`.
   - Revisa que las credenciales y el puerto `5432` en `DATABASE_URL` sean correctos.

2. **Error de NextAuth al iniciar sesión (`NEXTAUTH_URL_ERROR`):**
   - Verifica que `NEXTAUTH_URL` en `.env` sea exactamente `https://atlas.guacamolegh.es` (con `https://` y sin barra final `/`).

3. **Reparación del índice de Git en Windows (`repair-git.bat`):**
   - Si trabajas en local sobre Windows y te sale un error de índice dañado, ejecuta `npm run git:fix`.
