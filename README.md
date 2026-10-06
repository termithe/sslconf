# SSLConf

Utilidad web para inspeccionar certificados TLS, reconstruir cadenas CA mediante AIA, generar un CA bundle PEM ordenado y evaluar la configuración TLS pública de un servidor.

## Estado actual para retomar trabajo

Proyecto local:

```text
/home/victorcancela/tls-chain-inspector
```

Servicio local con Docker:

```text
http://127.0.0.1:3017
```

Comandos de comprobación rápida:

```bash
cd /home/victorcancela/tls-chain-inspector
docker compose ps
curl -sS -I http://127.0.0.1:3017/
curl -sS -I http://127.0.0.1:3017/scan
```

Regla de mantenimiento: cada cambio importante debe actualizar este README para conservar el hilo de decisiones, comportamiento y despliegue.

Ultima verificación correcta tras añadir SSL/TLS Server Test, ajustar su maquetación, añadir el desglose `Why this grade?`, aceptar URLs `https://`, agrupar recomendaciones accionables por severidad, añadir `How to improve this grade`, copiar fixes accionables, exportar informe HTML imprimible, guardar escaneos recientes en localStorage, reforzar SSRF/rangos reservados/puertos por fase/body limit, añadir telemetría mínima de API con `requestId`, añadir `/api/health` y healthcheck Docker, comprobar redirecciones HTTP/HTTPS, detectar OCSP stapling, convertir HTTP/2/ALPN en check explícito, enumerar ciphers TLS 1.2, recalibrar TLS 1.2 como compatibilidad heredada sin penalización, colorear el panel de nota por severidad, convertir la home en una suite de herramientas y destacar `SSL/TLS Server Test` / `Análisis SSL/TLS` como utilidad principal:

```bash
npm run typecheck
npm run lint
npm run build
docker compose up -d --build
```

## Punto de guardado

Antes del rediseño visual de SSLConf se creó un snapshot local en:

```text
.snapshots/20260731-150406-ui-before-redesign/
```

Ese snapshot contiene `app/`, `components/`, `lib/i18n.ts`, `README.md` y `tailwind.config.ts` tal como estaban antes de cambiar la identidad visual.

Antes del rediseño editorial posterior se creó además:

```text
.snapshots/20260922-sslconf-editorial-redesign-before/
```

Este segundo snapshot permite volver exactamente a la interfaz de paneles anterior. Para restaurarlo manualmente, revisar y copiar los ficheros necesarios desde el snapshot, sin sobrescribir cambios posteriores que se quieran conservar.

## Identidad visual

SSLConf usa una identidad distinta de DNSRadar: paleta azul/cian con verde de validación, cabecera con marca `SSLCONF` e icono de candado/certificado. El diseño actual sigue una dirección editorial técnica: superficies planas, reglas finas, contenido denso y la calificación TLS como foco visual. Se eliminó la retícula de fondo y se redujo el uso de tarjetas redondeadas para evitar el aspecto de libreta o dashboard genérico.

Los formularios y reportes usan jerarquía de documento: introducción, bloque de búsqueda, cabecera de informe, métricas y secciones separadas por líneas. El texto general usa una tipografía sans de lectura; los valores PEM y fragmentos de configuración conservan un tratamiento monoespaciado.

La cabecera funciona como suite de herramientas e incluye nombres unificados:

```text
SSL/TLS Server Test / Análisis SSL/TLS
CA Bundle Generator / Generador de CA bundle
CSR Decoder / Decodificador de CSR
```

La home (`/` y `/es`) no abre ya directamente el generador de CA bundle. Ahora funciona como consola de herramientas con una utilidad principal y dos herramientas secundarias:

```text
SSL/TLS Server Test / Análisis SSL/TLS
CA Bundle Generator / Generador de CA bundle
Certificate Decoder / Decodificador de certificados
CSR Decoder / Decodificador de CSR
```

`SSL/TLS Server Test` / `Análisis SSL/TLS` se muestra como la herramienta destacada porque es la utilidad más general para diagnosticar un sitio público. El formulario de análisis está integrado directamente en la portada, inmediatamente después de un título abreviado para mantenerlo visible: al enviar un dominio redirige a `/scan?host=...` o `/es/scan?host=...` para mostrar el informe completo. La portada no añade acciones secundarias ni un bloque redundante de herramienta destacada bajo ese formulario; `Certificate Decoder`, `CSR Decoder` y `CA Bundle Generator` quedan disponibles como herramientas secundarias en sus tarjetas.

La cabecera usa una composición de una columna hasta pantallas `xl`, antes de mostrar el panel lateral de comprobaciones. Así el título y el formulario principal conservan suficiente anchura y se evita dejar palabras aisladas en líneas separadas en portátiles y tablets.

Los nombres visibles se mantienen unificados en cabecera, botones de home, tarjetas, títulos, estados de carga y metadatos. Se evita mezclar `Server Test`, `Test de servidor` y `Análisis SSL/TLS`, así como `Chain Builder`, `Generador de cadena` y `Generar CA bundle` para la misma utilidad.

En `SSL/TLS Server Test` / `Análisis SSL/TLS`, cuando hay resultados, el informe se renderiza a ancho completo debajo del bloque introductorio. Esto evita que métricas, protocolos, certificado y findings queden encerrados en una columna estrecha. Los errores crudos de OpenSSL en protocolos no soportados se resumen en mensajes legibles para no romper la maquetación.

El panel principal de nota usa color semántico:

```text
A+ / A = verde
B / C = ámbar
D / E / F / T / M = rojo
```

Esto permite ver rápidamente si el sitio está en buen estado, en estado mejorable o con problemas serios.

El reporte incluye una sección `Why this grade?` / `Por qué esta nota` que muestra:

```text
puntuación base
penalizaciones aplicadas
detalle de cada penalización
puntuación final
```

Esa sección se alimenta directamente del backend (`gradeBreakdown`) para que la explicación visible coincida con el cálculo real de la nota.

El reporte también incluye `How to improve this grade` / `Cómo mejorar esta nota` antes de las recomendaciones completas. Esta sección muestra los fixes prioritarios para intentar llegar a A+, ordenados por severidad y dejando fuera las recomendaciones meramente informativas.

El reporte también incluye `Recommendations` / `Recomendaciones` antes de `Findings`. Las recomendaciones se agrupan por severidad:

```text
Critical level / Nivel crítico
High level / Nivel alto
Medium level / Nivel medio
Low level / Nivel bajo
Information / Información
```

Cada recomendación viene desde el backend (`recommendations[]`) con:

```text
severity
title
impact
action
config opcional
```

Cuando procede, se muestran snippets para nginx, Apache o DNS. Ejemplos actuales:

```text
HSTS fuerte para nginx y Apache
ssl_protocols TLSv1.2 TLSv1.3
CAA DNS de ejemplo
```

El panel de acciones de SSL/TLS Server Test permite:

```text
copiar informe resumido
copiar fixes accionables
descargar JSON completo
descargar informe HTML imprimible
copiar enlace compartible
nuevo escaneo
```

El formulario de SSL/TLS Server Test muestra `Recent scans` / `Escaneos recientes` cuando existen consultas previas en el navegador. El historial:

```text
se guarda en localStorage
solo se actualiza tras un escaneo completado correctamente
mantiene hasta 6 hosts
permite rellenar el formulario con un click
puede limpiarse desde el propio formulario
```

Clave usada:

```text
sslconf_recent_scan_hosts
```

`Copy all fixes` / `Copiar fixes` copia solo recomendaciones prácticas (`critical`, `high`, `medium`, `low`) ordenadas por importancia, con acción y snippets de configuración si existen. Si un resultado solo tiene recomendaciones informativas, copia esas señales como fallback.

`HTML report` / `Informe HTML` genera un fichero `.html` autocontenido desde el resultado actual del escaneo. Incluye estilos embebidos y está pensado para abrirlo en navegador, imprimirlo o guardarlo como PDF. El informe contiene resumen de nota, acciones prioritarias, penalizaciones, certificado, protocolos, señales HTTP/DNS, hallazgos, recomendaciones y suites TLS 1.2.

El reporte incluye `Configuration profiles` / `Perfiles de configuración`, con snippets copiables de baseline para:

```text
nginx
Apache
```

Estos perfiles se generan en cliente a partir del resultado del escaneo: host canónico detectado, aliases conocidos y estado de OCSP stapling. El baseline recomienda TLS 1.2 + TLS 1.3, HTTP/2, HSTS largo y ciphers modernos aunque el servidor actual todavía no los tenga activos. No sustituyen una revisión de producción: las rutas de certificados, nombres de vhost, proxy/CDN y política HSTS deben adaptarse antes de aplicar los bloques en un servidor real.

El reporte incluye `HTTP redirects` / `Redirecciones HTTP`, con dos flujos:

```text
HTTP flow
HTTPS flow
```

Cada flujo muestra los saltos seguidos, estado HTTP, cabecera `Location`, HSTS si aparece en ese salto y URL final. Esto permite explicar casos como un dominio raíz que redirige a `www` sin enviar HSTS en la respuesta 301.

El reporte muestra `OCSP stapling` dentro de señales HTTP/DNS. La API solicita OCSP stapling durante el handshake TLS (`requestOCSP`) y marca si el servidor entrega una respuesta OCSP stapled. Si falta, genera recomendación de baja severidad con snippets nginx/Apache. De momento no penaliza la nota.

El reporte muestra `HTTP/2` como señal explícita basada en ALPN. La API devuelve:

```text
http2.supported
http2.negotiatedProtocol
http2.alpnProtocols
```

Si no negocia `h2`, genera recomendación de baja severidad con snippets nginx/Apache. De momento no penaliza la nota.

## Herramienta 1: Certificate Decoder / Decodificador de certificados

La utilidad vive en:

```text
/decode
/es/decode
```

Acepta un único certificado X.509 en formato PEM o DER codificado en Base64. No acepta claves privadas: las entradas con cabeceras `PRIVATE KEY` se rechazan antes de interpretar el certificado.

El análisis se realiza únicamente en memoria en el runtime Node.js. No se almacenan certificados, no se usan ficheros temporales, no hay caché y no se consulta ninguna CA, DNS o servicio externo. La respuesta incluye:

```text
subject e issuer
serial, validez y huellas SHA-256 / SHA-512
tipo, tamaño o curva de clave pública
algoritmo de firma
indicador de autoridad certificadora
SAN, AIA, CRL distribution points
key usage y extended key usage
```

Endpoint:

```text
POST /api/certificate/decode
```

Payload:

```json
{
  "certificate": "-----BEGIN CERTIFICATE-----\\n...\\n-----END CERTIFICATE-----",
  "locale": "es"
}
```

El body máximo es `CERTIFICATE_DECODE_BODY_MAX_BYTES=70000` bytes. El endpoint aplica `RATE_LIMIT_DECODE_MAX=30` peticiones por cliente y ventana, no registra el contenido del certificado y responde con `Cache-Control: no-store`.

El área PEM incluye un botón de papelera con tooltip para limpiar el certificado, el error y el resultado anterior antes de realizar otra prueba.

## Herramienta 2: CSR Decoder / Decodificador de CSR

La utilidad vive en:

```text
/csr
/es/csr
```

Acepta una única solicitud PKCS#10 en PEM o DER codificado en Base64. Se rechazan claves privadas antes del parser. El análisis se realiza solo en memoria, sin ficheros temporales, caché, DNS ni consultas a CA externas.

La validación comprueba la firma contra la clave pública incluida en la propia CSR y presenta:

```text
subject
clave RSA y tamaño cuando está disponible
algoritmo y validez de la firma PKCS#10
SAN y extensiones solicitadas mediante extensionRequest
hallazgos sobre SAN ausentes, SHA-1 y tamaño RSA menor de 2048 bits
```

Endpoint:

```text
POST /api/csr/decode
```

Payload:

```json
{
  "csr": "-----BEGIN CERTIFICATE REQUEST-----\\n...\\n-----END CERTIFICATE REQUEST-----",
  "locale": "es"
}
```

El body máximo es `CSR_DECODE_BODY_MAX_BYTES=70000` bytes. El endpoint aplica `RATE_LIMIT_CSR_MAX=30` peticiones por cliente y ventana, no registra el contenido y responde con `Cache-Control: no-store`.

## Herramienta 3: CA Bundle Generator

El CA Bundle Generator no copia ciegamente la cadena instalada en el servidor. El flujo actual es:

1. Conecta al host por TLS con SNI y obtiene el certificado leaf.
2. Lee la extensión `Authority Information Access` del leaf.
3. Descarga el issuer desde `CA Issuers`, tanto si viene como certificado X.509 directo como si viene dentro de un contenedor PKCS#7 `.p7c`.
4. Repite el proceso con cada issuer.
5. Valida firmas, vigencia y ruta hacia una raíz confiable.
6. Si AIA devuelve una raíz self-signed, intenta seleccionar un cross-sign de compatibilidad.
7. Para cross-signs usa primero el repositorio local de certificados conocidos y después crt.sh solo si se activa explícitamente.
8. Usa certificados servidos por el servidor solo como candidatos válidos de cross-sign o fallback, nunca como fuente única de verdad.

Las fuentes se priorizan así:

```text
AIA / CA Issuers
repositorio local de cross-signs conocidos
crt.sh opcional para cross-signs alternativos
cadena servida por el servidor como fallback validado
trust store local para cerrar la validación
```

Todos los candidatos se validan criptográficamente antes de aparecer en el bundle.

Algunas CA, como Sectigo, publican ciertos issuers en AIA como `application/pkcs7-mime`. En ese caso la API extrae todos los certificados del contenedor PKCS#7 y selecciona solo el candidato que firma el certificado actual.

Si un AIA adicional falla pero la cadena ya puede cerrarse contra una raíz confiable local, la API no muestra ese fallo como warning final. Esto evita ruido con certificados antiguos o cross-signs publicados en AIA que ya no son necesarios para validar la ruta.

Por defecto genera un `ca-bundle` estilo proveedor, es decir:

```text
intermedio 1
intermedio 2
...
```

No incluye el certificado leaf. Tampoco incluye la raíz salvo que `includeRoot` sea `true`.

Ejemplo actual para `www.civislend.com`:

```text
includeRoot=false
  SSL.com TLS Issuing RSA CA R1
  SSL.com TLS RSA Root CA 2022, cross-signed por Entrust Root Certification Authority - G2

includeRoot=true
  SSL.com TLS Issuing RSA CA R1
  SSL.com TLS RSA Root CA 2022, cross-signed por Entrust Root Certification Authority - G2
  Entrust Root Certification Authority - G2
```

## Idiomas

El idioma por defecto es inglés:

```text
/
/check
/decode
/csr
```

La versión española vive en:

```text
/es
/es/check
/es/decode
/es/csr
/es/scan
```

`/check` y `/es/check` abren el generador de CA bundle con el formulario vacío cuando no hay `host`. El análisis solo se ejecuta al llegar con `?host=...`.

El middleware lee `Accept-Language` y, si el navegador prefiere español y no hay una cookie de idioma previa, redirige `/` a `/es`, `/check` a `/es/check` y `/scan` a `/es/scan` conservando la query string. El selector `EN/ES` guarda la preferencia en la cookie:

```text
sslconf_locale
```

La API acepta `locale: "en" | "es"` para devolver resumen y trazado en el idioma de la página.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre `http://localhost:3017` si arrancas con:

```bash
npm run dev -- --port 3017
```

Evita ejecutar `npm run build` mientras `npm run dev` sigue vivo en el mismo proyecto; puede dejar `.next` incoherente en desarrollo. Para probar producción:

```bash
npm run typecheck
npm run lint
npm run build
```

## Arranque manual

Modo desarrollo:

```bash
cd /home/victorcancela/tls-chain-inspector
npm run dev -- --port 3017
```

Modo producción local:

```bash
cd /home/victorcancela/tls-chain-inspector
npm run build
npm start -- --port 3017
```

## Docker

Docker Compose se usa como entorno local estable y como opción alternativa para VPS. Para `sslconf.com`, el destino principal previsto sigue siendo Vercel.

La opción recomendada para que SSLConf arranque tras reiniciar el equipo en local es Docker Compose:

```bash
cd /home/victorcancela/tls-chain-inspector
docker compose up -d --build
```

El contenedor publica:

```text
http://localhost:3017
```

Y usa:

```text
restart: unless-stopped
```

Con Docker arrancando al inicio del sistema, el contenedor volverá a levantarse automáticamente tras reiniciar. Comandos útiles:

```bash
docker compose ps
docker compose logs -f sslconf
docker compose restart sslconf
docker compose down
```

Docker Compose incluye healthcheck interno contra:

```text
http://127.0.0.1:3000/api/health
```

Para verlo:

```bash
docker compose ps
docker inspect --format '{{.State.Health.Status}}' sslconf
```

## Healthcheck

Endpoint público liviano:

```text
GET /api/health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "service": "sslconf",
  "version": "0.1.0",
  "uptimeSeconds": 123,
  "timestamp": "2026-08-03T07:30:49.000Z"
}
```

No ejecuta escaneos, no hace DNS externo y responde con `Cache-Control: no-store`. Es apto para monitorización externa, Zabbix, Uptime Kuma o checks de despliegue.

## Vercel

Despliegue recomendado para `sslconf.com`.

### Estado de despliegue

El proyecto Vercel `sslconf` está creado en el equipo `vcancela-2529s-projects` y está conectado al repositorio privado `termithe/sslconf` desde el 2026-10-05. La rama `main` es la fuente de los despliegues de producción.

La URL de producción es:

```text
https://sslconf.vercel.app
```

El primer despliegue basado en Git quedó verificado el 2026-10-05: el alias estable, las rutas `/`, `/scan`, `/check` y `GET /api/health` respondieron correctamente. Cada nuevo `push` a `main` crea una nueva producción.

### Flujo Git y Vercel

El repositorio local se inicializó el 2026-10-05 en la rama `main`. El flujo objetivo de despliegue es:

```text
main -> Production en Vercel
otras ramas y pull requests -> Preview Deployment en Vercel
```

El repositorio privado ya está creado y conectado. Para clonar o reconstruir el flujo en otro equipo:

```bash
git remote add origin git@github.com:termithe/sslconf.git
git push -u origin main
vercel git connect https://github.com/termithe/sslconf.git
```

El repositorio local usa SSH para publicar cambios en GitHub. La integración de
Vercel se conecta al mismo repositorio mediante la aplicación de GitHub de
Vercel; no reutiliza ni expone la clave SSH local.

`.gitignore` excluye secretos y artefactos locales: `.env.local`, `.vercel/`, `node_modules/`, `.next*` y `.snapshots/`. El fichero `.env.example` se mantiene en Git como plantilla sin valores reales. Una vez conectado, cada `git push origin main` crea el despliegue de producción; para rollback se puede promover un deployment previo en Vercel o revertir el commit y volver a hacer push.

Validaciones realizadas:

```text
GET /api/health: 200
cabeceras de seguridad: presentes
POST /api/tls/scan con example.com: A / 85, chain.verified=true
```

Antes de asociar `sslconf.com` como sitio público final quedan dos tareas: configurar Redis REST compartido para el rate limit distribuido y cargar secretos de producción (`RATE_LIMIT_KEY_SALT` y `SSLCONF_LOG_SALT`).

Variables importantes a configurar en Vercel:

```text
NEXT_PUBLIC_SITE_URL=https://sslconf.com
ENABLE_CRTSH_RUNTIME_LOOKUP=0
RATE_LIMIT_WINDOW_SECONDS=60
RATE_LIMIT_MAX=20
RATE_LIMIT_SCAN_MAX=12
RATE_LIMIT_CHAIN_MAX=20
RATE_LIMIT_TARGET_WINDOW_SECONDS=60
RATE_LIMIT_TARGET_MAX=30
RATE_LIMIT_TARGET_SCAN_MAX=12
RATE_LIMIT_TARGET_CHAIN_MAX=30
RATE_LIMIT_KEY_SALT=<secreto-propio>
RATE_LIMIT_REDIS_REST_URL=<upstash-rest-url>
RATE_LIMIT_REDIS_REST_TOKEN=<upstash-rest-token>
RATE_LIMIT_REDIS_TIMEOUT_MS=1500
RATE_LIMIT_REDIS_FAIL_OPEN=1
TLS_SCAN_CACHE_TTL_SECONDS=300
TLS_CHAIN_CACHE_TTL_SECONDS=600
TLS_CACHE_MAX_ENTRIES=500
API_JSON_BODY_MAX_BYTES=4096
SSLCONF_LOG_LEVEL=info
SSLCONF_LOG_SALT=<secreto-propio>
TLS_TIMEOUT_MS=8000
AIA_TIMEOUT_MS=5000
AIA_MAX_BYTES=1000000
CHAIN_MAX_DEPTH=8
```

En Vercel, el healthcheck externo debe apuntar a:

```text
https://sslconf.com/api/health
```

El rate limit en memoria no es suficiente como protección principal en Vercel porque puede haber varias instancias y reinicios. Para producción pública se recomienda activar `RATE_LIMIT_REDIS_REST_URL` y `RATE_LIMIT_REDIS_REST_TOKEN`.

Las rutas fijan el runtime y duración máxima de forma explícita:

```text
POST /api/tls/scan: Node.js, 45 segundos
POST /api/tls/chain: Node.js, 60 segundos
```

Los límites evitan que los timeouts internos de TLS, HTTP, AIA y OCSP acumulen ejecuciones indefinidas. Ajustarlos solo tras revisar duración real, cuota y límites del plan Vercel.

### Runbook de primer despliegue

1. Importar el repositorio en una cuenta Vercel independiente y dejar que detecte Next.js.
2. Crear una base Redis REST compatible con Upstash y copiar URL/token como secretos de producción.
3. Copiar `.env.example` a las variables del proyecto, sustituyendo `RATE_LIMIT_KEY_SALT` y `SSLCONF_LOG_SALT` por dos valores aleatorios distintos. Nunca subir `.env.local` ni tokens al repositorio.
4. Configurar `NEXT_PUBLIC_SITE_URL` con la URL Preview para pruebas, y con `https://sslconf.com` solo en Production.
5. Desplegar primero un Preview. Validar `GET /api/health`, un SSL/TLS Server Test, un CA Bundle Generator y que los endpoints devuelvan `X-SSLConf-Request-Id` y `X-RateLimit-Source: redis`.
6. Asociar `sslconf.com`, comprobar el certificado emitido por Vercel y desplegar Production.
7. Configurar monitorización externa contra `https://sslconf.com/api/health`.

Las variables de Preview deben usar Redis y salts distintos de Production. Esto evita que pruebas o ramas de desarrollo consuman los mismos límites que el sitio público.

### Verificación y rollback

Tras un despliegue de producción:

```bash
curl -sS https://sslconf.com/api/health
curl -sS -I https://sslconf.com/scan
```

En Vercel, comprobar los logs filtrando por `sslconf_api_request` y errores. Si aparece una regresión, promover el deployment de producción anterior desde el dashboard de Vercel o volver a desplegar el commit anterior. No es necesario eliminar variables ni datos de Redis para ese rollback; las claves caducan conforme a su TTL.

## Repositorio CA local

La aplicación de producción no debe depender de crt.sh ni de CCADB en cada consulta. Los cross-signs conocidos viven en:

```text
data/ca-repository/cross-signs.pem
```

Los nombres que alimentan el repositorio offline están en:

```text
data/ca-repository/seeds.json
```

Para actualizar el repositorio desde crt.sh fuera del camino crítico:

```bash
npm run repository:update
npm run typecheck
npm run lint
npm run build
```

El script:

```text
1. Lee los subjects configurados en seeds.json.
2. Busca candidatos en crt.sh.
3. Si crt.sh falla o no aporta candidatos, consulta CCADB All Certificate PEMs por años NotBefore.
4. Descarga certificados candidatos.
5. Descarta certificados caducados, self-signed o no CA.
6. Conserva solo cross-signs que encadenan a una raíz confiable local.
7. Reescribe data/ca-repository/cross-signs.pem.
```

La API carga ese fichero local y lo usa antes de cualquier fallback de servidor.

La validación usa las raíces incluidas en Node.js y, si existe, el bundle CA del sistema (`/etc/ssl/certs/ca-certificates.crt`). La imagen Docker instala `ca-certificates` para que cadenas antiguas o cross-signed, como algunas de Amazon/Starfield, validen igual que en un host Linux normal.

`seeds.json` permite limitar los años que se consultan en CCADB:

```json
{
  "crossSignSubjects": ["SSL.com TLS RSA Root CA 2022"],
  "ccadbNotBeforeYears": [2026, 2025, 2024, 2023, 2022]
}
```

CCADB es una fuente pública oficial para certificados CA raíz/intermedios, pero no sustituye la validación local: cada PEM encontrado se comprueba con `node:crypto` antes de guardarse.

## Endpoint

- `POST /api/tls/chain`

Payload:

```json
{
  "host": "www.civislend.com",
  "includeRoot": false
}
```

También acepta puertos explícitos en el host para servicios TLS habituales:

```text
example.com:443
mail.example.com:993
```

## Seguridad

La API bloquea IPs privadas/reservadas antes de conectar por TLS y antes de descargar certificados AIA, consultar OCSP o seguir redirecciones. El bloqueo cubre rangos IPv4 privados, loopback, link-local, CGNAT, benchmarking, documentación, multicast y reservados. En IPv6 bloquea loopback, unspecified, ULA, link-local, documentación, multicast, IPv4-mapped y formatos expandidos equivalentes.

Los destinos se validan por fase:

```text
entrada SSL/TLS Server Test: 443, 8443
entrada CA Bundle Generator: 443, 465, 636, 8443, 993, 995
AIA / CA Issuers: http/https en 80 o 443
OCSP responder: http/https en 80 o 443
redirecciones HTTP/HTTPS: 80, 443, 8443
```

En conexiones TLS y HTTP basadas en `node:tls` / `node:http` / `node:https`, la app usa un `lookup` validado para evitar re-resolución implícita después de comprobar DNS. Las descargas AIA y consultas OCSP también usan ese `lookup` validado, con timeout y límite de bytes durante la lectura. Las consultas externas fijas, como HSTS preload o crt.sh opcional, mantienen `fetch` con timeout y tamaño máximo de respuesta.

También limita puertos, timeouts, tamaño de descarga AIA, tamaño de respuesta OCSP, tamaño de respuesta HSTS preload, profundidad máxima de cadena y tamaño real de body JSON de API.

Variable para body JSON:

```text
API_JSON_BODY_MAX_BYTES=4096
```

Los errores de API se normalizan por fase para evitar devolver trazas internas: DNS, IP privada/reservada, puerto no permitido, protocolo no permitido, timeout, conexión rechazada o redirecciones excesivas.

Cada respuesta API incluye una cabecera de correlación:

```text
X-SSLConf-Request-Id
```

Los errores JSON también devuelven `requestId` para poder cruzar lo que ve el usuario con logs de servidor.

Las rutas API emiten logs JSON mínimos por petición:

```json
{
  "event": "sslconf_api_request",
  "requestId": "...",
  "tool": "scan",
  "status": 200,
  "durationMs": 1234,
  "host": "example.com",
  "port": 443,
  "cache": "MISS",
  "client": "hash-corto"
}
```

No se guarda la IP en claro. Se guarda un hash corto calculado con sal configurable.

Variables de log:

```text
SSLCONF_LOG_LEVEL=info
SSLCONF_LOG_SALT=change-me-in-production
```

`SSLCONF_LOG_LEVEL=silent` desactiva estos logs. En producción debe cambiarse `SSLCONF_LOG_SALT` para evitar hashes correlables entre entornos.

Las rutas API aplican rate limit por IP y herramienta:

```text
/api/tls/scan  -> scope scan
/api/tls/chain -> scope chain
```

Modo local por defecto: memoria del proceso. Modo producción recomendado: Redis REST compatible con Upstash para que el límite sea compartido entre instancias, reinicios y despliegues serverless.

La clave de rate limit no guarda la IP en claro. Se usa:

```text
rate:tls:{scope}:{sha256(RATE_LIMIT_KEY_SALT + ip)}
```

Variables:

```text
RATE_LIMIT_WINDOW_SECONDS=60
RATE_LIMIT_MAX=20
RATE_LIMIT_SCAN_MAX=12
RATE_LIMIT_CHAIN_MAX=20
RATE_LIMIT_KEY_SALT=change-me-in-production
RATE_LIMIT_REDIS_REST_URL=
RATE_LIMIT_REDIS_REST_TOKEN=
RATE_LIMIT_REDIS_TIMEOUT_MS=1500
RATE_LIMIT_REDIS_FAIL_OPEN=1
```

Si `RATE_LIMIT_REDIS_REST_URL` y `RATE_LIMIT_REDIS_REST_TOKEN` están definidos, la app usa Redis REST con `INCR`, `EXPIRE NX` y `TTL` en pipeline. Si Redis falla y `RATE_LIMIT_REDIS_FAIL_OPEN=1`, cae a memoria como fallback para no dejar inutilizada la herramienta. Si `RATE_LIMIT_REDIS_FAIL_OPEN=0`, un fallo de Redis bloquea temporalmente la petición con `429`.

Las respuestas incluyen:

```text
X-RateLimit-Limit
X-RateLimit-Remaining
X-RateLimit-Reset
X-RateLimit-Source: memory | redis | memory-fallback
Retry-After, solo en 429
```

También hay cache en memoria con TTL e in-flight dedupe para evitar escaneos duplicados simultáneos sobre el mismo host:

```text
scan: host + port + locale
chain: host + port + includeRoot + locale
```

Las respuestas cacheadas exponen:

```text
X-SSLConf-Cache: HIT | MISS | INFLIGHT
X-SSLConf-Cache-Age
X-SSLConf-Cache-TTL
```

Los resultados tienen acciones de exportación en cliente:

```text
SSL/TLS Server Test:
- copiar informe resumido
- copiar fixes accionables
- descargar JSON completo
- descargar informe HTML imprimible
- copiar enlace compartible
- nuevo escaneo
- copiar baseline nginx
- copiar baseline Apache

CA Bundle Generator:
- copiar PEM
- descargar PEM
- copiar informe resumido
- descargar JSON completo
- copiar enlace compartible
```

Puertos permitidos actualmente:

```text
443, 465, 636, 8443, 993, 995
```

## Herramienta 4: SSL/TLS Server Test

La segunda utilidad pública vive en:

```text
/scan
/es/scan
```

El objetivo es aproximarse progresivamente a un reporte tipo SSL Labs, pero con motor propio para no depender de servicios externos ni de restricciones comerciales de terceros.

La primera versión comprueba:

```text
certificado leaf
validación de cadena y hostname
TLS 1.0, TLS 1.1, TLS 1.2 y TLS 1.3
cipher negociado por versión soportada
enumeración de suites TLS 1.2 soportadas desde catálogo curado
detección básica de orden de preferencia de ciphers TLS 1.2
detalles avanzados de protocolo TLS 1.2
compresión TLS
renegociación iniciada por cliente
reanudación de sesión TLS 1.2
key exchange efímero y tamaño DH/ECDH
TLS_FALLBACK_SCSV como señal no concluyente si el runtime no lo puede probar
ALPN negociado
HTTP/2 negociado por ALPN
HSTS
HSTS preload real consultando hstspreload.org
OCSP stapling
revocación OCSP contra el responder de la CA
DNS CAA
redirección HTTP -> HTTPS
redirección HTTPS y HSTS en respuestas 301/302
host canónico final
longitud de cadena de redirecciones
caducidad próxima
nota A+, A, B, C, D, E, F, T o M
desglose de puntuación y penalizaciones
recomendaciones accionables por severidad
sección de fixes prioritarios para mejorar nota
perfiles de configuración nginx/Apache copiables
```

Notas especiales:

```text
T = problema de confianza en la cadena
M = mismatch de hostname
```

La puntuación actual es propia de SSLConf. No pretende ser byte a byte equivalente a SSL Labs todavía. Faltan fases más profundas como simulación completa de clientes antiguos, checks exhaustivos de vulnerabilidades históricas, downgrade tests con bajo nivel de OpenSSL y análisis PQC.

La nota representa seguridad TLS, no una política universal de compatibilidad. Un endpoint que ofrece solo TLS 1.3 mantiene un aviso de compatibilidad para clientes heredados, pero no pierde puntos ni baja de letra por ese único motivo. `A+` exige `100/100`; HSTS ausente o corto resta 5 puntos y deja el resultado en `A`, alineando este caso con el criterio práctico de SSL Labs.

Validación de referencia realizada el 2026-10-05:

```text
civislend.com
TLS 1.3: disponible
TLS 1.2: no disponible, aviso medio de compatibilidad
HSTS: ausente
SSLConf: A / 95
SSL Labs: A
```

La confianza usada por el `SSL/TLS Server Test` se valida mediante un handshake TLS nativo con `rejectUnauthorized: true`, usando el almacén de confianza efectivo del runtime Node/OpenSSL. La reconstrucción propia por AIA se conserva para generar el CA bundle y mostrar su ruta, pero no fuerza una nota `T` cuando su inventario manual de raíces difiere del almacén efectivo del runtime.

Penalizaciones actuales:

```text
hostname no cubierto: nota M directa
cadena no confiable: -60 y nota T
certificado caduca en <= 7 días: -25
certificado caduca en <= 30 días: -10
TLS 1.3 no disponible: -5
TLS 1.2 no disponible: aviso medio de compatibilidad, sin penalización
TLS 1.0 habilitado: -20
TLS 1.1 habilitado: -20
cipher débil negociado: -15
cipher TLS 1.2 débil soportado: -10
compresión TLS activa: -25
renegociación iniciada por cliente aceptada: -5
DH efímero inferior a 2048 bits: -15
certificado revocado por OCSP: -80
HSTS ausente o max-age < 15552000: -5
CAA ausente: informativo, sin penalización
TLS_FALLBACK_SCSV desconocido: informativo, sin penalización
session resumption no concluyente: informativo, sin penalización
compatibilidad con clientes antiguos: informativo, sin penalización
```

Recomendaciones actuales:

```text
hostname no cubierto: corregir SAN/certificado
cadena no confiable: instalar CA bundle correcto
caducidad próxima: renovar y automatizar alertas
TLS 1.3 ausente: activar TLS 1.3 cuando el stack lo soporte
TLS 1.2 ausente: mantener TLS 1.2 junto a TLS 1.3
TLS 1.0/TLS 1.1 habilitados: deshabilitar protocolos antiguos
cipher débil: limitar suites a AEAD con forward secrecy
ciphers TLS 1.2 débiles soportados: limitar catálogo a ECDHE + AEAD
compresión TLS activa: deshabilitar compresión
renegociación iniciada por cliente aceptada: bloquear renegociación de cliente salvo dependencia controlada
DH débil: usar ECDHE moderno o DHE mínimo 2048 bits
HSTS ausente/corto: enviar Strict-Transport-Security en todas las respuestas HTTPS
HSTS preload declarado pero no activo: verificar requisitos en hstspreload.org antes de enviar el dominio
CAA ausente: publicar CAA para las CA autorizadas
HTTP no redirige a HTTPS: forzar redirección permanente a HTTPS
redirección HTTPS sin HSTS: enviar HSTS también en 301/302
cadena de redirecciones larga: simplificar a un único salto canónico
OCSP stapling ausente: activarlo en servidor, proxy o CDN si está soportado
certificado revocado por OCSP: reemitir certificado y sustituir la instalación actual
HTTP/2 no negociado: activar HTTP/2 en servidor, proxy o CDN
```

La API devuelve las redirecciones en:

```text
redirects.http
redirects.https
redirects.canonicalHost
```

Cada hop incluye:

```text
url
statusCode
location
hsts
```

La API devuelve la enumeración TLS 1.2 en:

```text
tls12Ciphers.scanned
tls12Ciphers.supported
tls12Ciphers.serverOrder
tls12Ciphers.preferredCipher
```

Cada suite soportada incluye:

```text
name
opensslName
keyExchange
authentication
encryption
bits
forwardSecrecy
aead
weak
weakness
```

`serverOrder` se estima comparando la negociación con el catálogo en orden normal e inverso. Si ambos handshakes seleccionan la misma suite, se marca `server`; si cambian, se marca `client`; si no hay datos suficientes, `unknown`.

Los aliases del catálogo que no existen o están deshabilitados en la versión local de OpenSSL se tratan como no disponibles. Esto evita que una suite heredada no soportada por el runtime rompa el escaneo completo.

La API devuelve detalles avanzados de protocolo en:

```text
protocolDetails.compression
protocolDetails.secureRenegotiation
protocolDetails.clientRenegotiation
protocolDetails.fallbackScsv
protocolDetails.sessionResumption
protocolDetails.keyExchange
```

Estas señales siguen una política conservadora: solo penalizan configuraciones claramente peligrosas o explotables, como compresión TLS activa, renegociación iniciada por cliente aceptada o DH efímero inferior a 2048 bits. Estados `unknown` o no concluyentes se muestran para transparencia pero no bajan la nota.

La API devuelve la comprobación de revocación OCSP en:

```text
ocspRevocation.checked
ocspRevocation.status
ocspRevocation.responderUrl
ocspRevocation.producedAt
ocspRevocation.thisUpdate
ocspRevocation.nextUpdate
ocspRevocation.revocationTime
ocspRevocation.error
```

Estados posibles:

```text
good
revoked
unknown
not-supported
error
```

Solo `revoked` penaliza la nota. `not-supported`, `unknown` y `error` se muestran como señal informativa o advertencia para evitar falsos negativos por fallos temporales del responder OCSP.

La API devuelve el estado real de HSTS preload en:

```text
hstsPreload.checked
hstsPreload.status
hstsPreload.name
hstsPreload.domain
hstsPreload.preloadedDomain
hstsPreload.bulk
hstsPreload.error
```

Estados posibles:

```text
preloaded
pending
pending-removal
removed
unknown
rejected
error
```

Este check usa `https://hstspreload.org/api/v2/status?domain=<host>`. No penaliza por no estar en preload, porque no todos los dominios deben pre-cargar HSTS. Si el header contiene la directiva `preload` pero la lista pública aún devuelve `unknown`, `removed` o `rejected`, se muestra como advertencia y recomendación.

Endpoint:

```text
POST /api/tls/scan
```

Payload:

```json
{
  "host": "payrest.com",
  "locale": "es"
}
```

El campo `host` de SSL/TLS Server Test acepta tanto hostname limpio como URL HTTPS completa. La API extrae hostname y puerto e ignora path/query:

```text
conasi.eu
www.conasi.eu
https://www.conasi.eu
https://www.conasi.eu/es/?utm_source=test
https://www.conasi.eu:8443/
```

Puertos permitidos actualmente para SSL/TLS Server Test:

```text
443, 8443
```

Variables opcionales:

```bash
RATE_LIMIT_WINDOW_SECONDS=60
RATE_LIMIT_MAX=20
RATE_LIMIT_SCAN_MAX=12
RATE_LIMIT_CHAIN_MAX=20
TLS_SCAN_CACHE_TTL_SECONDS=300
TLS_CHAIN_CACHE_TTL_SECONDS=600
TLS_CACHE_MAX_ENTRIES=500
TLS_TIMEOUT_MS=8000
AIA_TIMEOUT_MS=5000
AIA_MAX_BYTES=1000000
CHAIN_MAX_DEPTH=8
CRTSH_SEARCH_TIMEOUT_MS=15000
CRTSH_CERT_TIMEOUT_MS=5000
CRTSH_MAX_CANDIDATES=5
ENABLE_CRTSH_RUNTIME_LOOKUP=0
TLS_SCAN_HTTP_TIMEOUT_MS=6000
TLS_SCAN_MAX_REDIRECTS=6
TLS_SCAN_USER_AGENT="SSLConf/0.1 (+https://sslconf.com)"
TLS_SCAN_CIPHER_CONCURRENCY=6
TLS_SCAN_OCSP_TIMEOUT_MS=6000
TLS_SCAN_OCSP_MAX_BYTES=250000
TLS_SCAN_HSTS_PRELOAD_TIMEOUT_MS=5000
TLS_SCAN_HSTS_PRELOAD_MAX_BYTES=50000
CERTIFICATE_DECODE_BODY_MAX_BYTES=70000
CSR_DECODE_BODY_MAX_BYTES=70000
NEXT_PUBLIC_SITE_URL=https://sslconf.com
```

`ENABLE_CRTSH_RUNTIME_LOOKUP` debe quedarse en `0` en producción salvo necesidad puntual. El flujo recomendado es actualizar `cross-signs.pem` offline y desplegar ese artefacto versionado.

El rate limit se aplica tanto por cliente como por destino. El segundo límite usa una clave hash de `host:puerto`, por lo que evita que varios clientes puedan concentrar demasiados escaneos sobre un tercero. Valores iniciales recomendados:

```text
SSL/TLS Server Test: 12 comprobaciones por destino/minuto
CA Bundle Generator: 30 comprobaciones por destino/minuto
Certificate Decoder: 30 comprobaciones por cliente/minuto
CSR Decoder: 30 comprobaciones por cliente/minuto
```

El límite por destino se evalúa solo después de validar el hostname y puerto. En despliegue con varias instancias Vercel requiere `RATE_LIMIT_REDIS_REST_URL` y `RATE_LIMIT_REDIS_REST_TOKEN` para ser compartido entre instancias.

## Despliegue

### Cabeceras de seguridad

Next.js añade globalmente estas cabeceras a las páginas y APIs:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` restringiendo cámara, micrófono, geolocalización, pagos y USB
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`

HSTS no se fuerza desde la aplicación para no activar accidentalmente políticas persistentes durante las pruebas locales. Cuando `sslconf.com` esté validado en producción, se puede añadir en Vercel o en la configuración del dominio. Una CSP estricta queda pendiente de validación con todos los recursos de Next.js y de la interfaz.

El endpoint necesita runtime Node.js porque usa `node:tls`, `node:crypto` y resolución DNS del servidor. No debe desplegarse como Edge Function.

La ruta API declara explícitamente:

```ts
export const runtime = "nodejs";
```
