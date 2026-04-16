# 🛒 WoodyCart

> Lista de compras compartida, en tiempo real, sin login.

![WoodyCart Logo](./public/logo_new.png)

Creá una lista, compartí el link y cualquier persona puede ver y editar en tiempo real — sin cuenta, sin registro.

---

## ✨ Funcionalidades

| Feature | Descripción |
| --- | --- |
| Múltiples listas | Creá tantas como quieras |
| Compartir | Link único — cualquiera puede ver y editar |
| Tiempo real | Cambios instantáneos entre usuarios vía Supabase Realtime |
| Categorías | Agrupá ítems por sección con colores personalizados |
| Drag & drop | Reorganizá ítems entre categorías |
| Imágenes | Subí fotos de productos (Supabase Storage) |
| Checkboxes | Tachá artículos ya comprados |
| Swipe actions | Deslizá un ítem para editar o borrar |
| Archivar | Archivá listas sin eliminarlas |
| Sin login | No hace falta cuenta ni registro |

---

## 🛠️ Stack

- **Frontend**: React 18 + Vite
- **Backend**: Supabase (PostgreSQL + Realtime + Storage)
- **Hosting**: Vercel

---

## 📋 Prerrequisitos

- [Node.js](https://nodejs.org) ≥ 18
- npm ≥ 9
- Cuenta en [Supabase](https://supabase.com) (plan gratuito alcanza)
- Cuenta en [Vercel](https://vercel.com) (plan gratuito alcanza)

---

## 🚀 Despliegue paso a paso

### 1. Forkear y clonar el repo

```bash
git clone https://github.com/TU_USUARIO/woodycart.git
cd woodycart
npm install
```

### 2. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) → **New project**
2. Elegí nombre, contraseña y región → esperá ~2 min

### 3. Ejecutar el schema SQL

1. Supabase Dashboard → **SQL Editor** → **New query**
2. Pegá el contenido de [`supabase-schema.sql`](./supabase-schema.sql)
3. Ejecutá con **Run**

### 4. Configurar Storage

1. **Storage** → **New bucket**
2. Nombre: `item-images`, activá **Public bucket** → **Create**

### 5. Activar Realtime

1. **Database** → **Replication**
2. Activá las tablas `items` y `categories`

### 6. Obtener credenciales

1. **Settings** → **API**
2. Copiá **Project URL** y **anon / public key**

### 7. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Editá `.env.local`:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxxxxxxxxxxx
```

### 8. Subir a GitHub

```bash
git add .
git commit -m "feat: initial setup"
git remote add origin https://github.com/TU_USUARIO/woodycart.git
git push -u origin main
```

### 9. Desplegar en Vercel

1. [vercel.com](https://vercel.com) → **Add New Project** → importá el repo
2. Agregá las variables de entorno (las mismas del paso 7)
3. Framework preset: **Vite** → **Deploy** 🎉

---

## 🔧 Desarrollo local

```bash
# Instalar dependencias
npm install

# Crear variables de entorno
cp .env.example .env.local
# Editá .env.local con tus credenciales de Supabase

# Arrancar servidor de desarrollo
npm run dev
```

Abrí [http://localhost:5173](http://localhost:5173)

---

## 🧪 Tests

```bash
# Tests unitarios en modo watch
npm run test

# Tests unitarios una sola vez
npm run test -- --run

# Tests E2E con Playwright (levanta el dev server automáticamente)
npm run test:e2e

# Tests E2E con interfaz interactiva
npm run test:e2e:ui

# Tests E2E en modo debug
npm run test:e2e:debug
```

---

## 📁 Estructura

```
woodycart/
├── public/
│   ├── logo.svg                 # Logo WoodyCart
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── AddItemSheet.jsx     # Sheet para agregar/editar ítems
│   │   ├── CategorySheet.jsx    # Sheet para gestionar categorías
│   │   └── ItemRow.jsx          # Fila de ítem con swipe actions
│   ├── pages/
│   │   ├── Home.jsx             # Pantalla principal — lista de listas
│   │   └── ListPage.jsx         # Pantalla de una lista
│   ├── lib/
│   │   └── supabase.js          # Cliente Supabase
│   ├── App.jsx
│   └── main.jsx
├── tests/                       # Tests E2E (Playwright)
│   ├── home.spec.js
│   ├── list.spec.js
│   └── helpers/
│       └── api-mock.js
├── supabase-schema.sql          # Schema de la base de datos
├── playwright.config.js
├── vite.config.js
├── .env.example
└── package.json
```

---

## 📱 Instalar como app (iPhone)

1. Abrí WoodyCart en Safari
2. Compartir → **"Añadir a pantalla de inicio"**

---

## 📄 Licencia

MIT — usalo, modificalo y compartilo libremente.
