# Despliegue en Vercel

Esta app usa TanStack Start, Vite, Nitro y Supabase. Ya esta configurada para que Nitro genere salida compatible con Vercel.

## Configuracion recomendada

En Vercel:

- Framework Preset: `TanStack Start`
- Install Command: `npm install`
- Build Command: `npm run build`
- Node.js: `20.x` o superior

El archivo `vite.config.ts` fija `nitro: { preset: "vercel" }`, asi que no hace falta configurar `NITRO_PRESET` en Vercel. El archivo `vercel.json` tambien deja definidos los comandos de install y build para que el import sea directo.

## Variables de entorno

Agrega estas variables en Project Settings > Environment Variables para Production y Preview:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Estas variables empiezan con `VITE_`, por lo tanto se incluyen en el bundle del navegador. Usa aqui solo la URL publica de Supabase y la anon key publica. No pongas service role keys ni secretos privados con prefijo `VITE_`.

## Supabase Auth

Como el login usa `window.location.origin` para confirmar el email, tambien debes permitir los dominios de Vercel en Supabase:

- Authentication > URL Configuration > Site URL: tu dominio principal, por ejemplo `https://chuturubises.vercel.app`
- Authentication > URL Configuration > Redirect URLs:
  - `https://chuturubises.vercel.app`
  - `https://*.vercel.app`
  - `http://localhost:5173`
  - `http://127.0.0.1:5173`

Cuando conectes un dominio propio, agrega tambien ese dominio a Site URL y Redirect URLs.

## Checklist antes de publicar

1. Subir el proyecto a GitHub, GitLab o Bitbucket.
2. Importar el repositorio desde Vercel.
3. Confirmar que Vercel detecte `TanStack Start`.
4. Cargar las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
5. Ejecutar el primer deploy.
6. Probar login, perfil, muro, caja y subida de comprobantes/fotos.

## Nota de Supabase

El codigo local ya apunta a Supabase, pero el repositorio no incluye migraciones SQL. Para que el proyecto sea totalmente reproducible fuera de Lovable, conviene exportar o documentar el esquema: tablas, policies RLS, buckets de Storage y configuracion de Realtime.
