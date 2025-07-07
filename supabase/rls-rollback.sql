-- RLS Rollback Script
-- SOLO ejecutar en caso de emergencia si RLS causa problemas críticos

-- =====================================================
-- ROLLBACK COMPLETO DE RLS (EMERGENCIA)
-- =====================================================

-- PASO 1: Deshabilitar RLS en todas las tablas
ALTER TABLE families DISABLE ROW LEVEL SECURITY;
ALTER TABLE family_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE actions DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE special_action_configs DISABLE ROW LEVEL SECURITY;

-- PASO 2: Eliminar todas las políticas RLS
DROP POLICY IF EXISTS "Users can view their families" ON families;
DROP POLICY IF EXISTS "Users can update their families" ON families;
DROP POLICY IF EXISTS "Users can create families" ON families;

DROP POLICY IF EXISTS "Users can view family memberships" ON family_members;
DROP POLICY IF EXISTS "Users can join families" ON family_members;
DROP POLICY IF EXISTS "Users can update their memberships" ON family_members;
DROP POLICY IF EXISTS "Users can delete their memberships" ON family_members;

DROP POLICY IF EXISTS "Users can view family subjects" ON subjects;
DROP POLICY IF EXISTS "Users can create family subjects" ON subjects;
DROP POLICY IF EXISTS "Users can update family subjects" ON subjects;
DROP POLICY IF EXISTS "Users can delete family subjects" ON subjects;

DROP POLICY IF EXISTS "Users can view family actions" ON actions;
DROP POLICY IF EXISTS "Users can create family actions" ON actions;
DROP POLICY IF EXISTS "Users can update family actions" ON actions;
DROP POLICY IF EXISTS "Users can delete family actions" ON actions;

DROP POLICY IF EXISTS "Users can view family events" ON events;
DROP POLICY IF EXISTS "Users can create family events" ON events;
DROP POLICY IF EXISTS "Users can update their family events" ON events;
DROP POLICY IF EXISTS "Users can delete their family events" ON events;

DROP POLICY IF EXISTS "Users can view family special configs" ON special_action_configs;
DROP POLICY IF EXISTS "Users can create family special configs" ON special_action_configs;
DROP POLICY IF EXISTS "Users can update family special configs" ON special_action_configs;
DROP POLICY IF EXISTS "Users can delete family special configs" ON special_action_configs;

-- PASO 3: Eliminar funciones auxiliares
DROP FUNCTION IF EXISTS user_belongs_to_family(UUID);
DROP FUNCTION IF EXISTS rls_diagnostic();

-- =====================================================
-- VERIFICACIÓN POST-ROLLBACK
-- =====================================================

-- Verificar que RLS está deshabilitado
SELECT 
  schemaname||'.'||tablename as table_name,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('families', 'family_members', 'subjects', 'actions', 'events', 'special_action_configs')
ORDER BY tablename;

-- Verificar que no hay políticas restantes
SELECT COUNT(*) as remaining_policies
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('families', 'family_members', 'subjects', 'actions', 'events', 'special_action_configs');

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================

/*
⚠️  ADVERTENCIA: ESTE ROLLBACK ELIMINA TODAS LAS PROTECCIONES DE SEGURIDAD

Después de ejecutar este rollback:
1. La aplicación volverá a su estado de seguridad original (vulnerable)
2. Los usuarios podrían teóricamente acceder a datos de otras familias
3. La seguridad dependerá únicamente de la lógica de aplicación

CUÁNDO USAR ESTE ROLLBACK:
- Solo en caso de emergencia si RLS rompe la funcionalidad crítica
- Como medida temporal mientras se investigan problemas
- Si se necesita acceso completo para debugging

DESPUÉS DEL ROLLBACK:
1. Investigar y corregir los problemas que causaron la necesidad de rollback
2. Probar las políticas RLS en un entorno de desarrollo
3. Re-implementar RLS con las correcciones necesarias

ALTERNATIVA MENOS DRÁSTICA:
En lugar de rollback completo, considerar deshabilitar RLS tabla por tabla:
- ALTER TABLE [tabla_problemática] DISABLE ROW LEVEL SECURITY;
- Investigar problema específico
- ALTER TABLE [tabla_problemática] ENABLE ROW LEVEL SECURITY;

*/