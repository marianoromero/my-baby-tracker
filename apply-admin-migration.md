# Aplicar migración de roles de admin

## Instrucciones para hacer admin a mariano.es@gmail.com

**Archivo de migración creado:** `supabase/migrations/20250710125535_add_admin_roles.sql`

Para aplicar esta migración en Supabase, tienes dos opciones:

### Opción 1: Panel de Supabase (Recomendado)
1. Ve al panel de Supabase de tu proyecto
2. Navega a **SQL Editor**
3. Copia y pega el contenido del archivo `supabase/migrations/20250710125535_add_admin_roles.sql`
4. Ejecuta la consulta

### Opción 2: CLI de Supabase
Si tienes el CLI de Supabase configurado:
```bash
supabase db reset
# o alternativamente:
supabase migration up
```

## ¿Qué hace la migración?

1. **Añade columna `role`** a la tabla `family_members` con valores 'admin' o 'member'
2. **Hace admin a mariano.es@gmail.com** de la familia FWKZPX específicamente
3. **Crea función helper** `is_family_admin()` para verificar permisos
4. **Añade política RLS** para que solo admins puedan eliminar miembros
5. **Crea índice** para optimizar consultas por rol
6. **Preserva historial** - Los eventos de miembros eliminados se mantienen en el timeline

## Cambios en la aplicación

✅ **Frontend actualizado:**
- Función `isUserAdmin()` ahora verifica el rol en base de datos
- Botón eliminar solo visible para admins
- Creadores de nuevas familias automáticamente son admin
- Nuevos miembros que se unen son 'member' por defecto
- **Preservación de historial**: Los eventos se mantienen cuando se elimina un miembro

✅ **Seguridad implementada:**
- Solo admins pueden eliminar miembros
- Verificación de permisos en frontend y backend
- Políticas RLS aplicadas

✅ **Gestión de historial:**
- Eventos de miembros eliminados aparecen como "Miembro eliminado"
- Se conservan fechas, horas y acciones registradas
- Estilo visual diferenciado (gris, tachado) para miembros eliminados

## Verificación

Después de aplicar la migración:
1. El usuario mariano.es@gmail.com debería ver el botón "Eliminar" en la sección familia
2. Otros miembros NO deberían ver este botón
3. Solo mariano.es@gmail.com puede eliminar miembros de la familia FWKZPX

## Estado actual

- ✅ Migración creada
- ✅ Código frontend actualizado
- ⏳ **Pendiente: Aplicar migración en Supabase**

Una vez aplicada la migración, el sistema de administración estará completamente funcional.