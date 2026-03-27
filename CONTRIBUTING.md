# CONTRIBUTING

Guía rápida para contribuir al repositorio.

1) Configura tu entorno local (solo la primera vez)

En PowerShell (pwsh):

```powershell
git config --global user.name "Tu Nombre"
git config --global user.email "tu.email@example.com"
```


2) Flujo básico (paso a paso)

- Trae los últimos cambios de `develop`:

```powershell
git checkout develop
git pull origin develop
```

- Crea una rama para tu tarea/feature (nunca trabajes en `develop` ni en `main` directamente):

```powershell
git checkout -b feature/nombre-corto-descriptivo
```

- Haz cambios en tu rama. Añade archivos y confirma cambios:

```powershell
git add .
git commit -m "feat: descripción corta del cambio"
```

- Sube tu rama al remoto:

```powershell
git push -u origin feature/nombre-corto-descriptivo
```

- Abre un Pull Request en GitHub desde tu rama hacia `main`. En la descripción incluye:
  - Qué cambio hace.
  - Cómo probarlo localmente.
  - Capturas o pasos manuales si aplica.


3) Actualizar tu rama con cambios de `develop` (antes de pedir merge)

Si `develop` avanzó desde que creaste tu rama, actualiza tu rama con merge:

Merge:

```powershell
git checkout develop
git pull origin develop
git checkout feature/nombre-corto-descriptivo
git merge develop
# resolver conflictos si los hay
git add .
git commit
git push
```

4) Mensajes de commit recomendados (Conventional Commits)

- feat: nueva funcionalidad
- fix: corrección de bug
- docs: documentación
- style: formateo, estilo (no cambios lógicos)
- refactor: refactor sin añadir ni arreglar funcionalidad
- chore: tareas de mantenimiento

Ejemplo: `feat: añadir pantalla de pedido rápido`

5) Resolución de conflictos (breve)

- Git marcará los archivos en conflicto. Abrelos, busca las marcas `<<<<<<<`, `=======`, `>>>>>>>` and elige la versión correcta.
- Después de resolver todo: `git add <archivo>` y `git commit` si hiciste merge.

6) Pull Request y revisión

- Asigna Ale como revisor.
- Pide 1 aprobación mínimo.
- No mezcles muchas cosas en una sola rama: una tarea = una rama.

7) Qué no subir nunca

- Credenciales, tokens, archivos `.env` con secretos.
