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
