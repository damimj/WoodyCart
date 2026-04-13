# 🛒 WoodyCart

> Tu lista de compra compartida, en tiempo real, sin login.

![WoodyCart Logo](./public/logo.svg)

## Stack
- **Frontend**: React + Vite
- **Backend**: Supabase (PostgreSQL + Realtime + Storage)
- **Hosting**: Vercel (gratis)

---

## 🚀 Despliegue paso a paso

### 1. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) → **New project**
2. Elige nombre, contraseña y región
3. Espera a que arranque (~2 min)

### 2. Ejecutar el schema SQL

1. Supabase Dashboard → **SQL Editor** → **New query**
2. Pega el contenido de `supabase-schema.sql`
3. Pulsa **Run**

### 3. Configurar Storage

1. **Storage** → **New bucket**
2. Nombre: `item-images`, activa **Public bucket** → **Create**

### 4. Activar Realtime

1. **Database** → **Replication**
2. Activa las tablas `items` y `categories` en Supabase Realtime

### 5. Obtener credenciales

1. **Settings** → **API**
2. Copia **Project URL** y **anon / public key**

### 6. Subir a GitHub

```bash
git init
git add .
git commit -m "feat: initial WoodyCart setup"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/woodycart.git
git push -u origin main
```

### 7. Desplegar en Vercel

1. [vercel.com](https://vercel.com) → **Add New Project** → importa el repo
2. Añade las variables de entorno:
   ```
   VITE_SUPABASE_URL      = https://xxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. Framework preset: **Vite** → **Deploy** 🎉

---

## 📱 Añadir a pantalla de inicio (iPhone)

1. Abre WoodyCart en Safari
2. Compartir → **"Añadir a pantalla de inicio"**

---

## ✨ Funcionalidades

| Feature | Descripción |
|---|---|
| Múltiples listas | Crea tantas como quieras |
| Compartir | Link único, cualquiera puede ver y editar |
| Tiempo real | Supabase Realtime — cambios instantáneos entre usuarios |
| Categorías | Agrupa items por sección con colores personalizados |
| Imágenes | Sube fotos de productos (Supabase Storage, hasta 1GB gratis) |
| Checkboxes | Tacha artículos ya comprados |
| Archivar | Archiva listas sin eliminarlas |
| Swipe actions | Desliza un item para editar o borrar |
| Sin login | No hace falta cuenta ni registro |

---

## 🔧 Desarrollo local

```bash
# Instalar dependencias
npm install

# Crear variables de entorno
cp .env.example .env.local
# Edita .env.local con tus credenciales de Supabase

# Arrancar
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173)

---

## 📁 Estructura

```
woodycart/
├── public/
│   ├── logo.svg            # Logo WoodyCart (gato naranja en carrito)
│   └── favicon.svg         # Favicon
├── src/
│   ├── components/
│   │   ├── AddItemSheet.jsx
│   │   ├── CategorySheet.jsx
│   │   ├── ItemRow.jsx
│   │   └── Sheet.module.css
│   ├── lib/
│   │   └── supabase.js
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Home.module.css
│   │   ├── ListPage.jsx
│   │   └── ListPage.module.css
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── supabase-schema.sql
├── vercel.json
├── .env.example
└── package.json
```

---

## 📄 Licencia

MIT — úsalo, modifícalo y compártelo libremente.
