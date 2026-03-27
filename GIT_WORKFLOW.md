# Flujo de Git recomendado

Este documento complementa `CONTRIBUTING.md` con convenciones de ramas, normas para PR y consejos para que el pivote pueda mergear sin sorpresas.

Convenciones de ramas

- `develop` — rama de integración protegida. Todo el trabajo se integra aquí vía PR.
- `main` — rama de releases estables; solo se hace merge desde `develop` cuando se crea un release (tags).
- Feature branches: `feature/<nombre>` (creadas desde `develop`)
- Tasks: `task/<ticket>-<desc>` (si usas un tracker con IDs)
- Hotfix: `hotfix/<desc>` (hotfixes se crean desde `main` o `develop` según la urgencia)

Ejemplo práctico

1. Crear rama desde `develop`:

```powershell
git checkout develop
git pull origin develop
git checkout -b feature/login-supabase
```

2. Trabajar localmente, hacer commits claros:

```powershell
git add .
git commit -m "feat(auth): integrar login con supabase"
```

3. Push y abrir PR:

```powershell
git push -u origin feature/login-supabase
# Abrir PR en GitHub: base=develop, compare=feature/login-supabase
```

Revisión y merge 

 - Ale hace el merge final hacia `develop`. Requisitos antes del merge:
  - PR aprobado por al menos 1 revisor.
  - Tests básicos (si existen) pasan.
  - No hay conflictos con `develop`.

 - Si hay conflictos, pedir al autor que rebase con `develop` y resuelva. Si el autor no sabe, podemos ayudar.

Merge methods recomendados.
- Merge: mantiene commits atómicos.

Plantilla mínima para PR (copiar en la descripción):

- Título: `feat: <resumen>` o `fix: <resumen>`
- Descripción corta del cambio.
- Cómo probar: pasos concretos.
- ¿Incluye UI? añadir capturas.
- Relacionado con ticket: #ID (si aplica)

-Comentario Ale

- Revisar cambios con foco en: seguridad (no secrets), estructura del código, tests, y que el PR sea atómico.
- Si la rama tiene commits de estilo/format que no son relevantes, pedir que se reescriban o hacer squash.
