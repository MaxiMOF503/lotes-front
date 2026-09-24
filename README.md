# Consulta de lotes, mantenedor y estadísticas

Frontend Angular 19 con Leaflet, conectado a la API de lotes-back.

## Iniciar localmente

Requiere Node.js compatible con Angular 19 (se recomienda Node 22) y npm. Iniciar antes el backend en el puerto 8080 con MySQL y un administrador configurado mediante ADMIN_EMAIL y ADMIN_PASSWORD; consultar su guía docs/mantenedor-estadisticas.md.

```powershell
npm ci
npm start
```

Abrir http://localhost:4200. El archivo proxy.conf.json envía /api a http://127.0.0.1:8080. Si cambia el puerto del backend, actualizar ese archivo y reiniciar el frontend. No hace falta instalar Angular CLI globalmente.

## Funcionalidades

- Consulta pública por identificador o coordenadas exactas y selección en mapa, usando la API real.
- Campos sin información y procedencia visible por sección: simulado, no verificado u oficial.
- Administración: inicio/cierre de sesión, listado paginado, alta y edición de lotes, departamento y procedencia documental.
- Validaciones del formulario y mensajes del servidor, incluidos identificadores repetidos.
- Estadísticas: rango de fechas, totales y detalle diario de visitas, consultas, criterio y resultado.

Una visita equivale a cargar la aplicación. Recargar suma otra; cambiar de panel no. Las estadísticas no identifican personas ni representan visitantes únicos. Los contadores se guardan en el backend. Los archivos de mocks anteriores ya no alimentan las pantallas.

La sección Administración requiere una cuenta con rol ADMIN. La cookie de sesión se gestiona desde el servidor; las escrituras solicitan un token CSRF. No se guardan contraseñas ni tokens en localStorage.

## Despliegue

```powershell
npm run build
```

Publicar el contenido de dist/consulta-lotes-front/browser (comprobar outputPath en angular.json) y enrutar /api al backend en el mismo origen HTTPS. El proxy de desarrollo no se incluye en la compilación publicada. Configurar la cookie Secure en el backend al utilizar HTTPS.

## Verificación

La compilación de producción fue verificada. Leaflet conserva su advertencia CommonJS. Este proyecto no tiene configurado un ejecutor de pruebas automatizadas de frontend.

Se probó en navegador contra MySQL temporal: acceso de administrador, creación de lote, lectura pública de sus datos y procedencia, rechazo de duplicados, edición, consulta de estadísticas y cierre de sesión. El backend incorpora pruebas automatizadas de estos contratos y permisos.
