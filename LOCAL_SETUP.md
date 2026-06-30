# Ejecutar Chuturubises en local

Este proyecto fue creado en Lovable, pero ya puede ejecutarse localmente.

## Requisitos

- Node.js instalado.
- Acceso al proyecto Supabase configurado en `.env.local`.

## Comandos

```bash
npm install
npm run dev
```

La app queda disponible en:

```text
http://127.0.0.1:5173
```

Para generar build:

```bash
npm run build
```

## Supabase

La app usa estas variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Edita `.env.local` para apuntar a otro proyecto Supabase.

Importante: el repositorio no incluye migraciones SQL ni policies RLS. Para que el sistema sea 100% portable, hay que exportar o reconstruir el esquema Supabase: tablas, vistas, buckets, realtime y policies.
