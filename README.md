# LoteSeguro · frontend

[![Frontend CI](https://github.com/MaxiMOF503/lotes-front/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/MaxiMOF503/lotes-front/actions/workflows/frontend-ci.yml)

Angular 19 con Leaflet, conectado al backend lotes-back. Ofrece consulta pública de parcelas reales del catastro, registro, sesiones, permisos y estadísticas.

## Instalar en otra PC

Seguir la [guía del backend](https://github.com/MaxiMOF503/lotes-back/blob/area-interna-parcelas-reales/docs/instalacion-local.md): incluye la descarga de ambos repositorios, base MySQL, importación y cuentas de prueba.

Requiere Node.js 22 con npm. Iniciar primero el backend en el puerto 8080; luego, desde esta carpeta:

```powershell
.\iniciar-front.cmd
```

El asistente usa npm.cmd ci para instalar package-lock.json y arranca en http://localhost:4200. No requiere Angular CLI global. Si las dependencias ya están instaladas:

```powershell
npm.cmd start -- --host 127.0.0.1 --port 4200
```

proxy.conf.json envía /api a http://127.0.0.1:8080. Si cambia el puerto del backend, actualizar ese archivo y reiniciar el frontend. Angular nunca accede directamente a MySQL.

## Funcionalidades

El área interna abre Mi espacio para usuarios (consultas guardadas en su cuenta) y Parcelas reales para administradores (búsqueda por nomenclatura y fichas complementarias con fuente, referencia y control de versión). Ya no existe el mantenedor de lotes de demostración: la aplicación trabaja solo con datos oficiales importados. La documentación del backend en docs/area-interna-real.md explica los contratos.

- Consulta pública por nomenclatura catastral o por dirección (calles de Georef, con parcelas cercanas para elegir).
- Selección de parcelas reales en el mapa, con nomenclatura y atributos publicados, radio general de AYSAM y cercanía de tramos eléctricos.
- Capas reales de catastro, electricidad y agua, limitadas a la ventana visible. Catastro requiere zoom 15 y electricidad zoom 12. Si falta información o hay demasiados elementos, la interfaz lo indica.
- Procedencia y límites visibles: el radio de agua y una línea eléctrica próxima no confirman conexión ni factibilidad; los datos catastrales no acreditan titularidad.
- Registro de usuarios normales, inicio/cierre de sesión y lectura interna según rol.
- Administración de fichas complementarias de parcelas reales, con fuente, referencia documental y control de versión.
- Estadísticas por fechas, totales y detalle diario de visitas y consultas.

El mapa trabaja con la captura importada en la base local. Las parcelas del catastro no contienen domicilios fiables: por eso la búsqueda por dirección usa Georef y muestra las parcelas cercanas al punto aproximado para que el usuario elija la suya.

Las estadísticas no identifican personas ni representan visitantes únicos. Una visita corresponde a cargar la aplicación; las consultas territoriales cuentan como consultas por coordenadas. Mover el mapa o activar capas no aumenta las consultas.

La cookie de sesión la gestiona el servidor; las escrituras usan CSRF. No se guardan contraseñas ni tokens en localStorage. La cuenta ADMIN de clase es demo.admin@loteseguro.invalid y la de lectura demo.usuario@loteseguro.invalid; cada persona elige sus contraseñas al iniciar el backend.

## Compilación y despliegue

```powershell
npm.cmd run build
```

Publicar dist/consulta-lotes-front/browser y enrutar /api al backend en el mismo origen HTTPS. El proxy de desarrollo no forma parte de esa compilación. Configurar la cookie Secure en el backend al utilizar HTTPS.

## Verificación

El workflow [Frontend CI](.github/workflows/frontend-ci.yml) ejecuta los mismos controles en cada Pull Request y push a `main`, con Node.js 22 y una instalación reproducible basada en `package-lock.json`. Para reproducirlos localmente:

```powershell
npm.cmd ci
npm.cmd run verify
```

También se pueden ejecutar por separado:

```powershell
npm.cmd test
npm.cmd run build
```

La prueba unitaria disponible valida el exportador de informes. Los recorridos críticos se prueban en un navegador real con Playwright (ver [Pruebas E2E](#pruebas-e2e)); todavía no existe una suite Angular de componentes. Leaflet conserva su advertencia CommonJS y el paquete inicial supera el umbral de advertencia de 500 kB; la compilación termina correctamente.

### Historial, comparación e informes

Las consultas del mapa con sesión iniciada generan un historial privado en MySQL. Mi espacio permite revisar copias históricas, comparar dos o tres parcelas guardadas con fuentes actuales y exportar informes HTML/JSON o imprimirlos como PDF desde el navegador. Las guardadas incluyen Ver informe. Las consultas anónimas siguen disponibles sin registro personal. No se modifican datos catastrales ni registros anteriores.

Validar exportación: `node --test scripts/test-informe.cjs`. Compilar: `npm.cmd run build`.

### Reportes de datos

Cualquier cuenta puede marcar un dato incorrecto o faltante desde la ficha de una parcela y seguir sus reportes en **Mis reportes**. La cuenta ADMIN dispone además de la pestaña **Reportes** (con el contador de pendientes): filtra por estado (por defecto, pendientes), abre la parcela en el mapa, abre su ficha complementaria en **Parcelas reales** y cambia el estado con una respuesta para quien lo envió. Resolver o descartar exige una respuesta de al menos 10 caracteres. Los datos oficiales del catastro no se editan desde la aplicación. Contrato del backend: `docs/reportes-datos.md` de lotes-back.

### Pruebas E2E

Recorren la aplicación en Chromium: consulta pública por mapa, nomenclatura y dirección; ingreso y salida de ADMIN y USUARIO; permisos por rol; guardar y quitar una parcela; historial, informe y comparación; ficha complementaria del administrador (incluido el conflicto de edición); ciclo completo de reportes; sesión vencida, servidor caído, error interno y capa sin importar.

No necesitan backend ni MySQL: cada prueba instala una API falsa en memoria (`e2e/api-falsa.ts`) con parcelas sintéticas `E2E.*` (nomenclaturas `99000…`), cuentas `@e2e.test` y claves que solo existen ahí. Por eso son independientes entre sí, no dependen del orden y no tocan datos personales ni las bases locales. Los selectores son roles y etiquetas accesibles, y cada recorrido está dividido en pasos con nombre: un fallo indica el recorrido y el paso afectados. Las capturas y trazas solo se guardan cuando una prueba falla (`test-results/`).

```powershell
npm.cmd ci
npx.cmd playwright install chromium   # una sola vez por computadora
npm.cmd run e2e                        # inicia la app en el puerto 4300 y ejecuta todo
npm.cmd run e2e:ui                     # modo interactivo para depurar
```

Para ver el informe de un fallo: `npx.cmd playwright show-trace test-results/<carpeta>/trace.zip`. Si cambia el contrato del backend (campos o códigos de error), actualizá también la API falsa. En CI se ejecutan en el job "Pruebas E2E en navegador" y, si fallan, se sube un artefacto con capturas y trazas.

### Accesibilidad

La interfaz se audita contra WCAG 2.2 nivel AA. Las comprobaciones automáticas están en `e2e/accesibilidad.spec.ts` y se ejecutan con el resto de las pruebas E2E (`npm run e2e`, y en CI):

- **axe-core** sobre las pantallas de consulta pública, ingreso, espacio personal, administración, informes, diálogos y estados de error. Cualquier violación hace fallar la prueba y señala la regla y el elemento.
- **Teclado:** buscar, consultar e ingresar sin mouse; los diálogos (informe, confirmaciones y descartar cambios) llevan el foco adentro, no lo dejan escapar con Tab, se cierran con Escape y devuelven el foco al control que los abrió (`src/app/directives/foco-modal.directive.ts`).
- **Foco visible** en cada control del recorrido principal: anillo oscuro con halo claro definido en `src/styles.css`.
- **Errores:** se anuncian como alerta, mantienen lo escrito y los campos inválidos quedan asociados a su mensaje (`aria-invalid` y `aria-describedby`).
- **Responsive:** sin desplazamiento horizontal ni controles menores a 24×24 px a 360, 768, 1024 y 1440 px.
- **Movimiento:** se respeta `prefers-reduced-motion`.
- **Legibilidad:** ningún texto baja de 13 px (antes había texto de 9 a 11 px), el resto es un 7 % más grande, y los grises de texto tienen un contraste de 7:1 o más sobre fondo blanco.
- **Mapa:** quien no pueda usarlo tiene la misma consulta por nomenclatura o dirección; la región del mapa lo indica en su descripción accesible.

**Revisión manual pendiente con tecnología de asistencia** (las herramientas automáticas no la reemplazan). Antes de la entrega final, una persona debería recorrer con NVDA o Narrador en Windows y con VoiceOver o TalkBack en celular: (1) consulta por nomenclatura y por dirección, (2) ingreso y cierre de sesión, (3) guardar una parcela y abrir su informe, (4) enviar un reporte, (5) un error de conexión. Además, comprobar con zoom al 200 % y al 400 %, y con el contraste forzado de Windows. Registrar acá la fecha, el lector usado y lo encontrado.

Para sumar una pantalla nueva a la auditoría, agregá un paso `sinViolaciones(page, 'nombre')` en `e2e/accesibilidad.spec.ts`.
