# 🌍 Atlas: Multi-Universo Personal (Cinephile & Gamer Hub)

> Centro de mando unificado de nivel comercial que fusiona un **Launcher Genérico y Modular** con dos universos independientes de entretenimiento: **Cinephile Hub** (Cine, Series, Streaming y Sofa Knowledge 🛋️) y **Gamer Hub** (Videojuegos, Multi-Plataforma, RAWG y Game Knowledge con Metacritic). Con sistema completo de **Autenticación Multi-Usuario, Ranking Global, Muros de Reseñas, Sistema de Amigos Separado y Perfiles Públicos Unificados (v5.0)**. Desplegado en **Vercel** con base de datos en la nube en **Supabase PostgreSQL**.

<div align="center">

[![Live Demo](https://img.shields.io/badge/🌐_Web_Oficial-Visitar_Atlas-0ea5e9?style=for-the-badge&logo=vercel&logoColor=white)](https://master-hub-guacamolegh.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js_14-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase_PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

**🔗 Acceso en vivo:** [https://master-hub-guacamolegh.vercel.app](https://master-hub-guacamolegh.vercel.app)

</div>

---

## 📜 Historial de Versiones (Changelog)

### 🛸 v5.0.0 — Perfil Público Unificado con Slider, Amigos Separados & Core Refactor _(Versión Actual)_

- **Perfil Público Unificado en Atlas (`/u/[username]`):**
  - Mantiene el contexto global del Launcher **Atlas (Centro de Mando)** sin forzar al usuario a entrar al header de un solo universo.
  - **Selector Deslizante Dual (Slider / Switcher):** Alterna fluidamente entre **Cinephile Hub** (estética dorada/ámbar) y **Gamer Hub** (estética neón púrpura/cian) con audio háptico (`sounds.switch()`) y sincronización de query params (`?tab=cinema` o `?tab=gaming`) sin recarga de página.
  - **Compartir Inteligente:** El botón de compartir copia la URL con la pestaña activa para que el receptor aterrice directamente en el universo correspondiente.
  - **Catálogo Completo Integrado (`WatchedCatalogSection`):** Visualización navegable de todo el historial de visionados o biblioteca de juegos directamente en el perfil.
  - Redirección canónica instantánea desde `/games/u/[username]` hacia `/u/[username]?tab=gaming`.
- **Ecosistemas de Amigos Separados:**
  - **Amigos Cinéfilos (`/friends`):** Espacio dedicado dentro de Cinephile Hub para conectar con críticos y seguidores de cine y series.
  - **Amigos Gamer (`/games/friends`):** Espacio independiente dentro de Gamer Hub enfocado en compañeros de videojuegos y bibliotecas compartidas.
- **Vitrina Top 5:**
  - Ampliación de la vitrina favorita de Top 4 a **Top 5**, destacando las mejores obras (películas y series combinadas en Cine, o videojuegos en Gaming).
- **Atlas Wrapped Dual (`SocialWrappedModal`):**
  - Generación de historias en formato 9:16 tanto para **Cinephile Wrapped** como para **Gamer Wrapped** con métricas y títulos destacados de cada universo.
- **Limpieza de Gamificación:**
  - Retirada del sistema de medallas/trofeos redundante para priorizar la velocidad, la analítica pura (Sofa Knowledge, Game Knowledge, Critic vs You) y el medidor de afinidad.

### 🏆 v4.0.0 — Gamification, Trophy Room, SFX 2.0 & Social Wrapped

- **Atlas Wrapped — Tarjeta Social Compartible (`SocialWrappedModal`):**
  - Generador visual de tarjetas en alta resolución 9:16 (1080x1920) renderizado directamente con **HTML5 Canvas**, optimizado para Instagram Stories, Twitter/X y WhatsApp Status.
  - Descarga instantánea en archivo PNG de alta calidad y soporte para la **Web Share API** nativa en dispositivos móviles.
- **Motor de Audio Arcade SFX 2.0 (`lib/sounds.ts`):**
  - Nuevos efectos sintetizados mediante **Web Audio API** nativa (sin assets externos, sin latencia):
    - `playPirate()`: Tintineo náutico de doblones de oro al marcar la plataforma Pirata 🏴‍☠️.
    - `playShutter()`: Clic de obturador mecánico de cámara analógica para Atlas Wrapped.
    - `playLevelUp()`: Acorde ascendente de subida de nivel.
    - `playSwitch()`: Conmutación háptica entre universos y pestañas.
  - Botón de audio interactivo (`SoundToggle`) incorporado en la cabecera principal del Launcher.

### 🚀 v3.0.0 — User Management & Social Hub

- **Autenticación Multi-Proveedor:**
  - Integración completa con **NextAuth.js** con registro seguro y verificación por credenciales (contraseñas encriptadas con `bcryptjs`).
  - Inicio de sesión rápido y seguro con **Google OAuth** y **Discord OAuth**.
  - Sesiones persistentes JWT y vinculación automática de cuentas en Supabase PostgreSQL.
- **Gestión de Invitados & Control de Acceso:**
  - Modo invitado libre para explorar y consultar catálogos, detalles de obras y muros de reseñas.
  - Redirección con retorno inteligente (`/login?callbackUrl=...`) al intentar personalizar perfiles, guardar reseñas o votar.
- **Muros Críticos de Reseñas Comunitarias:**
  - Espacio de críticas cinéfilas (`/reviews` o `/resenas`) y críticas gamer (`/games/reviews` o `/games/resenas`).
  - Buscador reactivo en tiempo real por obra, usuario crítico o texto de la reseña.
  - Criterios de ordenación: 🕒 _Más recientes_, ⭐ _Mayor nota_ (Aclamadas) y 🔥 _Hot Takes_ (Mayor discrepancia con la crítica oficial).
  - Tarjetas de reseña completas con carátula en alta resolución, insignia de Ball/Game Knowledge, spoiler warning y fecha.
- **Salón de la Fama & Leaderboard Global (`/leaderboard`):**
  - Podio interactivo con los tres mejores usuarios de la comunidad.
  - Pestañas independientes: **General**, **Cine & Series** y **Videojuegos**.
  - Algoritmo de puntuación **Atlas Score** basado en volumen de obras registradas, nivel de experiencia y precisión cultural acumulada.
- **Perfiles Sociales Públicos:**
  - Páginas públicas compartibles con biografía, estadísticas de carrera, desglose de notas y vitrina de favoritos.
  - **Medidor de Afinidad Cultural:** Calcula el porcentaje de coincidencia de gustos y criterios entre dos usuarios.
- **Modales de Perfil & Presets de Avatares:**
  - Modales emergentes para Cine (`EditCinephileProfileModal`) y Videojuegos (`EditGamerProfileModal`).
  - 16 insignias vectoriales temáticas personalizadas y soporte para URLs de imágenes externas.

### 🎮 v2.1.0 — Multi-Plataforma Granular & UI Refinements

- **Desglose de Horas Multi-Plataforma:**
  - Registro de horas y estado específico por plataforma (ej. _80h en Steam_, _20h en Nintendo Switch_).
  - Paneles analíticos y gráficos de dedicación por consola/tienda.
- **Catálogo Retro & Moderno:**
  - Soporte para ecosistemas clásicos: PS1, PS2, PS3, PS4, PS5, Xbox 360, Xbox One, Xbox Series, GameCube, N64, GBA y consolas portátiles.
- **Ficha Cinéfila Flexible:**
  - Casilla `[x] Asignar nota` interactiva para registrar visionados sin necesidad de puntuación numérica obligatoria.
- **Optimizaciones de Rendimiento:**
  - Índices en base de datos Supabase, lazy loading de carátulas y scripts de mantenimiento de índice Git para Windows (`repair-git.bat`).

### 🛸 v2.0.0 — Gamer Hub & Arquitectura Multi-Universo

- **Launcher Genérico Modular (`/`):**
  - Pantalla principal para navegar entre universos con métricas en tiempo real de cada ecosistema.
- **Lanzamiento de Gamer Hub (`/games`):**
  - Integración con la API de **RAWG** con trailers, capturas oficiales y carátulas de videojuegos.
  - Sistema de **Backlog** y juegos **Completados/Platinados**.
- **Motor Game Knowledge (GK):**
  - Cálculo matemático de sintonía frente al consenso de Metacritic.
  - Tabla de **Hot Takes** clasificando títulos en _Overrated_ y _Based_.
- **Sistema de Nivel y XP Gamer:**
  - Barra de progreso dinámica, cálculo de experiencia y rangos desbloqueables (de _Novato de Silicio_ a _Leyenda del Píxel_).

### 🎬 v1.0.0 — Cinephile Hub

- **Lanzamiento Inicial de Cinephile Hub (`/movies`):**
  - Conexión con **TMDB API** para catálogo universal de películas y series.
  - Fichas interactivas con reparto, sinopsis, plataformas de streaming y enlace directo a IMDb.
  - Inclusión de plataforma especial 🏴‍☠️ _Pirata / Stremio_.
- **Motor Sofa Knowledge (SK):**
  - Cálculo de precisión cultural del usuario frente a las notas medias de IMDb.
- **Gestión de Colecciones:**
  - Listas de _Vistas_ y _Watchlist_ con filtrado por género, nota y plataforma.
  - Gráficos interactivos de distribución de notas, géneros favoritos y cronología de visionados.

---

## 🏛️ Arquitectura del Proyecto

```
prueba/
├── repair-git.bat             # Script de 1-clic para reparar índice de Git en Windows
├── prisma/
│   ├── schema.prisma          # Modelos User, Account, Session, Movie, UserMovie, Series, Game, UserGame
│   ├── seed.js                # Sembrador inicial para Cinephile Hub
│   └── seedGames.js           # Sembrador de videojuegos verificados para Gamer Hub
├── src/
│   ├── app/
│   │   ├── page.tsx           # Launcher Genérico (Centro de Mando v5.0)
│   │   ├── layout.tsx         # Layout global con AuthProvider, ToastProvider y navegación
│   │   ├── login/             # Página de inicio de sesión (Credenciales, Google, Discord)
│   │   ├── register/          # Registro de nuevos usuarios
│   │   ├── friends/           # Amigos y comunidad cinéfila
│   │   ├── reviews/           # Muro de reseñas de Cine & Series
│   │   ├── leaderboard/       # Salón de la fama y podio de usuarios
│   │   ├── u/[username]/      # Perfil público unificado con slider Cinephile/Gamer
│   │   ├── movies/            # Cinephile Hub (Home de Cine)
│   │   ├── movie/[id]/        # Ficha interactiva de película
│   │   ├── series/            # Cinephile Hub (Home de Series)
│   │   ├── series/[id]/       # Ficha interactiva de serie
│   │   ├── watchlist/         # Películas y series pendientes
│   │   ├── watched/           # Obras vistas con filtros y Sofa Knowledge
│   │   ├── profile/           # Perfil cinéfilo y analítica de Ball Knowledge
│   │   ├── search/            # Búsqueda en catálogo de cine y series (TMDB)
│   │   ├── games/             # Gamer Hub (Home de Videojuegos)
│   │   ├── games/[id]/        # Ficha de videojuego (trailers, screenshots, veredicto)
│   │   ├── games/friends/     # Amigos y comunidad gamer
│   │   ├── games/reviews/     # Muro de reseñas de Videojuegos
│   │   ├── games/backlog/     # Backlog de videojuegos pendientes
│   │   ├── games/completed/   # Videojuegos completados y platino
│   │   ├── games/profile/     # Perfil Gamer, Critic vs You y Hot Takes
│   │   ├── games/search/      # Buscador de videojuegos con RAWG API
│   │   ├── games/u/[username]/# Redirección canónica a /u/[username]?tab=gaming
│   │   └── api/               # Endpoints REST (auth, leaderboard, reviews, games, movies, series, u)
│   ├── components/
│   │   ├── DynamicNavHeader.tsx # Barra de navegación inteligente multi-universo (Atlas, Cine, Juegos)
│   │   ├── DynamicFooter.tsx    # Pie de página dinámico por universo
│   │   ├── leaderboard/         # Componentes del ranking (PodiumCard, LeaderboardRow, UserRankCard)
│   │   ├── reviews/             # Componentes de muro de opiniones (ReviewFeedCard)
│   │   ├── profile/             # TopFiveCard, WatchedCatalogSection, AffinityCard, SocialWrappedModal
│   │   ├── movies/              # Componentes cinéfilos (MovieCard, EditCinephileProfileModal, ReviewModal)
│   │   ├── games/               # Componentes gamer (GameCard, EditGamerProfileModal, GamerLevelBar, CriticVsYouChart)
│   │   └── shared/              # Sonido, Toasts, Avatares, Badges de Knowledge
│   ├── lib/
│   │   ├── prisma.ts          # Cliente Prisma ORM compartido
│   │   ├── auth.ts            # Configuración de NextAuth (Credenciales, Google, Discord)
│   │   ├── avatars.ts         # Catálogo de 16 avatares temáticos predefinidos
│   │   ├── sounds.ts          # Motor de audio Web sintetizado
│   │   ├── tmdb.ts            # Integración con The Movie Database
│   │   ├── rawg.ts            # Integración con RAWG Video Games API
│   │   ├── platforms.ts       # Catálogo de plataformas (Steam, Epic, Xbox, PlayStation, Nintendo...)
│   │   ├── ballKnowledge.ts   # Motor matemático de Ball Knowledge (Cine)
│   │   └── gameKnowledge.ts   # Motor matemático de Game Knowledge (Videojuegos)
│   └── types/                 # Definiciones TypeScript de NextAuth, Cine, Series y Juegos
```

---

## ✨ Universos y Funcionalidades

### 1. 🛸 Launcher Genérico (`/`)

- Pantalla de bienvenida modular para acceder a cualquier universo activo (**v5.0 Multi-Universo**).
- Tarjetas vivas con estadísticas de Cinephile Hub y Gamer Hub.
- Barra de navegación centralizada **Atlas (Centro de Mando)** que acompaña también en la vista de perfiles públicos.

### 2. 🎮 Gamer Hub (`/games/...`)

- **Integración RAWG API:** Carátulas, screenshots oficiales, trailers y enlaces directos a RAWG.
- **Registro Multi-Plataforma Granular:** Horas jugadas y estado independiente por plataforma (_Completado en PC_, _Jugando en PS5_, _Platinado en Steam_).
- **Estadísticas de Plataforma:** Paneles de horas acumuladas y dedicación por ecosistema (Steam, Xbox, PlayStation, Nintendo, Emuladores).
- **Motor Game Knowledge (GK):**
  $$\text{Game Knowledge (\%)} = \max\left(0,\, 100 - (|\text{Tu Nota} - \text{Nota Metacritic}| \times 10)\right)$$
- **Tus Hot Takes 🔥:** Detección automática de discrepancias con la prensa especializada (_Overrated_ vs _Based_).
- **Muro de Reseñas Gamer (`/games/reviews`):** Feed comunitario con ordenación por fecha, nota o controversia.
- **Comunidad Gamer (`/games/friends`):** Espacio exclusivo para seguir las bibliotecas de tus amigos gamer.

### 3. 🎬 Cinephile Hub (`/movies/...` y `/series/...`)

- **Catálogo de Cine y Series TMDB:** Fichas con reparto completo, sinopsis, pósteres y enlaces a **IMDb**.
- **Plataformas de streaming:** Netflix, Max, Prime Video, Disney+, Apple TV+, Movistar+, Filmin o **🏴‍☠️ Pirata / Stremio**.
- **Registro Flexible de Obras:** Opción de registrar películas o series con o sin puntuación numérica.
- **Motor Sofa Knowledge 🛋️:** Mide tu porcentaje de sintonía cultural frente a las valoraciones medias de IMDb.
- **Muro de Reseñas Cinéfilo (`/reviews`):** Feed comunitario con filtros de búsqueda instantánea y ordenación múltiple.
- **Comunidad Cinéfila (`/friends`):** Espacio para descubrir qué están viendo tus amigos en tiempo real.

---

## 🛠️ Comandos Útiles

### Iniciar en local:

```bash
npm run dev
# o para producción:
npm run build
npm run start
```

### Sembrar datos en Supabase:

```bash
npm run db:seed:all     # Siembra cine y videojuegos
npm run db:seed         # Solo cine
npm run db:seed:games   # Solo videojuegos
```

### 🩹 Reparar el error de índice de Git en Windows (`repair-git.bat`):

Si en tu consola de Windows alguna vez te sale `fatal: .git/index: index file smaller than expected`, simplemente ejecuta en la raíz del proyecto:

```bash
repair-git.bat
# o directamente en tu terminal:
npm run git:fix
```

---

## 🌐 Despliegue en Vercel & Variables de Entorno

### 📍 ¿Dónde están las Variables de Entorno en Vercel?

Para configurar las claves en producción, la ruta en el panel de control de Vercel es:

> **Tu Proyecto en Vercel** ➔ **Settings** (pestaña superior) ➔ **Environment Variables** (menú lateral izquierdo)

### 📋 Variables requeridas en Vercel:

| Variable                | Descripción / Ejemplo                                                         | Entorno Requerido   |
| :---------------------- | :---------------------------------------------------------------------------- | :------------------ |
| `NEXTAUTH_SECRET`       | Clave secreta para firmar sesiones JWT de NextAuth (32+ caracteres)           | Production, Preview |
| `NEXTAUTH_URL`          | URL pública de tu dominio en Vercel (`https://tu-proyecto.vercel.app`)        | Production, Preview |
| `DATABASE_URL`          | Conexión pooling de Supabase PostgreSQL (`...:6543/postgres?pgbouncer=true`)  | Production, Preview |
| `DIRECT_URL`            | Conexión directa de Supabase PostgreSQL (`...:5432/postgres`)                 | Production, Preview |
| `TMDB_API_KEY`          | Clave API de The Movie Database                                               | Production, Preview |
| `RAWG_API_KEY`          | Clave API de RAWG Video Games                                                 | Production, Preview |
| `GOOGLE_CLIENT_ID`      | Client ID de Google Cloud OAuth _(Opcional para login con Google)_            | Production, Preview |
| `GOOGLE_CLIENT_SECRET`  | Client Secret de Google Cloud OAuth _(Opcional para login con Google)_        | Production, Preview |
| `DISCORD_CLIENT_ID`     | Client ID de Discord Developer Portal _(Opcional para login con Discord)_     | Production, Preview |
| `DISCORD_CLIENT_SECRET` | Client Secret de Discord Developer Portal _(Opcional para login con Discord)_ | Production, Preview |

_Nota: Tras añadir o modificar variables en Vercel, recuerda hacer **Redeploy** del último despliegue para que surtan efecto._
