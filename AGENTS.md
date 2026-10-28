# Instrucciones del proyecto

## Alcance
- Aplica las reglas globales y estas instrucciones específicas.
- Trabaja sobre la petición actual y sus dependencias necesarias.
- Evita refactorizaciones, cambios de formato y mejoras ajenas a ella.

## Exploración eficiente
- Delimita primero el componente afectado.
- Localiza archivos y símbolos con rg --files y rg antes de leer.
- Lee los fragmentos necesarios y amplía la lectura si hace falta
  comprender dependencias o verificar un cambio.
- No recorras ni leas todo el repositorio por defecto.
- Evita dependencias instaladas, compilados, archivos generados,
  lockfiles y logs extensos, salvo que sean relevantes.
- Reutiliza lo aprendido en la conversación. Relee si hay cambios,
  dudas o necesitas comprobar el contenido exacto antes de editar.
- Filtra las salidas de comandos para mostrar solo lo relevante.

## Implementación y verificación
- Sigue los patrones existentes del componente que modificas.
- Comprueba el estado de Git antes de editar y respeta los cambios
  del usuario. No los reviertas ni sobrescribas.
- Ejecuta primero las comprobaciones relacionadas con el cambio.
- Amplía las pruebas si afecta a componentes compartidos, hay riesgo
  de regresión o lo requieren las instrucciones del proyecto.
- No repitas comprobaciones que ya pasan sin cambios o motivos nuevos.
- Informa de las pruebas realizadas y de las limitaciones pendientes.

## Continuidad
- Si existe SESSION_SUMMARY.md, léelo al iniciar una sesión nueva.
- Úsalo como orientación; verifica en el código lo necesario antes
  de modificarlo.
- Actualízalo al terminar un bloque significativo de trabajo o antes
  de dejar la sesión, si ha cambiado el estado del proyecto.
- Mantén un resumen breve, preferentemente de menos de 100 líneas:
  - Objetivo actual.
  - Decisiones y restricciones vigentes.
  - Archivos o componentes relevantes.
  - Trabajo realizado y pendientes.
  - Comprobaciones realizadas y siguiente paso.
- Sustituye información obsoleta. No acumules un diario de sesiones,
  logs ni fragmentos de código.
- No leas documentación extensa de forma automática: consulta las
  secciones necesarias para la tarea.

## Respuestas
- Explica brevemente qué cambió, cómo se verificó y qué queda pendiente.
- No reproduzcas archivos completos ni diffs extensos salvo petición.

## Datos específicos de SSLConf
- Directorio: `/home/victorcancela/tls-chain-inspector`.
- Producto: herramientas de diagnóstico SSL/TLS, certificados, CSR y cadenas CA.
- Stack declarado: Next.js 14 (App Router), React 18, TypeScript 5,
  Tailwind CSS 3 y PostCSS; iconos lucide-react, validación Zod y node-forge.
- npm con `package-lock.json`. Docker usa Node.js 20 Alpine;
  `package.json` no declara `engines`. No asumir la versión del runtime remoto.
- Producción: `https://www.sslconf.com`; alias `sslconf.vercel.app`.
- GitHub: `termithe/sslconf`. Vercel: proyecto `sslconf`, equipo
  `vcancela-2529s-projects`. Un push a `main` dispara producción:
  no publicar como efecto secundario de una tarea documental.
- Docker Compose es una alternativa local; no es requisito para Vercel.

## Mapa de carpetas
- `app/`: páginas, layouts y estilos con App Router; rutas inglesas sin prefijo.
- `app/es/`: páginas en castellano.
- `app/api/`: endpoints TLS, HTTP, certificados, CSR y healthcheck.
- `components/`: formularios, navegación y presentación de resultados.
- `lib/`: lógica compartida, escáner TLS, tipos, traducciones y metadatos SEO.
- `data/ca-repository/`: repositorio local de certificados CA.
- `scripts/`: actualización del repositorio CA y comprobación SEO.
- `middleware.ts`: comportamiento de rutas e idioma.
- `README.md`: funcionamiento y operación; consultar solo apartados relevantes.
- `SEO-PLAN.md`: planificación SEO; `SESSION_SUMMARY.md`: continuidad reciente.
- `.next/`, `node_modules/` y `.snapshots/` no son fuentes para exploración rutinaria.

## Comandos existentes
Ejecutar desde el directorio del proyecto:

| Uso | Comando | Condición |
| --- | --- | --- |
| Instalar dependencias fijadas | `npm ci` | Usa el lockfile; también usado en Docker |
| Desarrollo | `npm run dev -- --port 3017` | Elegir otro puerto si está ocupado |
| Tipos | `npm run typecheck` | Ejecuta `tsc --noEmit` |
| Lint | `npm run lint` | Ejecuta `next lint` |
| Compilar | `npm run build` | Ejecuta `next build` |
| Servir compilación local | `npm start -- --port 3017` | Requiere compilación previa |
| Prueba SEO local | `node scripts/check-seo.mjs http://localhost:3024` | Requiere aplicación sirviendo en ese puerto |
| Prueba SEO publicada | `node scripts/check-seo.mjs https://www.sslconf.com` | Hace peticiones HTTP, sin ejecutar escaneos TLS |
| Actualizar repositorio CA | `npm run repository:update` | Modifica datos; no es una prueba |
| Arranque Docker local | `docker compose up -d --build` | Compila y recrea el servicio local |
| Estado Docker local | `docker compose ps` | Solo consulta |

- No existe script `test` en `package.json`; no usar ni anunciar `npm test`.
- La prueba SEO comprueba las 24 páginas EN/ES, metadatos, títulos únicos,
  `WebSite` JSON-LD en la home, consultas `host`
  noindex, sitemap, robots, redirección de idioma y 404. No cubre el motor TLS.
- No ejecutar build mientras esté activo `next dev` en este mismo directorio:
  comparten `.next` y pueden dejar el entorno incoherente.
- Mantener EN/ES coherentes y actualizar README con cada cambio importante.
- No leer ni reproducir secretos de `.env.local`; usar `.env.example` como guía.
