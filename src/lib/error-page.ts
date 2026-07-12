export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>No pudimos cargar - Chuturubises Jrs.</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      * { box-sizing: border-box; }
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #050506; color: #fff; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; background-image: linear-gradient(120deg, rgba(20,165,56,.16), transparent 35%), linear-gradient(300deg, rgba(255,46,147,.12), transparent 40%); }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; border: 1px solid rgba(255,214,10,.3); border-radius: 1.5rem; background: rgba(14,14,16,.92); box-shadow: 0 24px 80px rgba(0,0,0,.55); }
      .logo { width: 5rem; height: 5rem; object-fit: cover; border-radius: 1rem; border: 1px solid rgba(255,214,10,.45); }
      .eyebrow { color: #00e0ff; margin: 1rem 0 .35rem; font-size: .65rem; font-weight: 900; letter-spacing: .22em; text-transform: uppercase; }
      h1 { color: #ffd60a; font-size: 1.5rem; margin: 0 0 0.5rem; }
      p { color: rgba(255,255,255,.62); margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { min-height: 2.75rem; padding: 0.6rem 1rem; border-radius: .75rem; font: inherit; font-weight: 800; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #ffd60a; color: #070708; }
      .secondary { background: rgba(255,255,255,.05); color: #ffe66d; border-color: rgba(255,214,10,.35); }
    </style>
  </head>
  <body>
    <div class="card">
      <img class="logo" src="/logo-256.webp" alt="" />
      <div class="eyebrow">Pausa técnica</div>
      <h1>No pudimos cargar la aplicación</h1>
      <p>Reintenta la conexión o vuelve al muro principal.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Reintentar</button>
        <a class="secondary" href="/">Ir al muro</a>
      </div>
    </div>
  </body>
</html>`;
}
