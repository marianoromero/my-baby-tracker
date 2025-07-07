-- RLS Verification Script
-- Ejecutar después de aplicar la migración RLS

-- =====================================================
-- 1. VERIFICAR ESTADO DE RLS
-- =====================================================

-- Verificar que RLS esté habilitado en todas las tablas
SELECT * FROM rls_diagnostic();

-- Verificar políticas creadas por tabla
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('families', 'family_members', 'subjects', 'actions', 'events', 'special_action_configs')
ORDER BY tablename, cmd;

-- =====================================================
-- 2. PRUEBAS DE SEGURIDAD (Para ejecutar con diferentes usuarios)
-- =====================================================

-- PRUEBA 1: Verificar que un usuario solo ve sus familias
-- (Ejecutar como usuario autenticado)
SELECT 
  'TEST: User families' as test_name,
  COUNT(*) as family_count,
  ARRAY_AGG(id) as family_ids
FROM families;

-- PRUEBA 2: Verificar que un usuario solo ve sujetos de sus familias
SELECT 
  'TEST: User subjects' as test_name,
  COUNT(*) as subject_count,
  ARRAY_AGG(name) as subject_names
FROM subjects;

-- PRUEBA 3: Verificar que un usuario solo ve eventos de sus familias
SELECT 
  'TEST: User events' as test_name,
  COUNT(*) as event_count,
  COUNT(DISTINCT subject_id) as unique_subjects
FROM events;

-- PRUEBA 4: Verificar que un usuario solo ve acciones de sus familias
SELECT 
  'TEST: User actions' as test_name,
  COUNT(*) as action_count,
  COUNT(DISTINCT subject_id) as unique_subjects
FROM actions;

-- =====================================================
-- 3. VERIFICAR FUNCIONALIDAD CRÍTICA
-- =====================================================

-- Función para probar join_family_by_code (si existe)
-- SELECT join_family_by_code('TEST123');

-- Verificar que las suscripciones real-time funcionan
-- (Las políticas RLS deben ser compatibles con real-time)

-- =====================================================
-- 4. DIAGNÓSTICO DE RENDIMIENTO
-- =====================================================

-- Verificar que las consultas sigan siendo eficientes
EXPLAIN (ANALYZE, BUFFERS) 
SELECT e.*, s.name as subject_name 
FROM events e 
JOIN subjects s ON e.subject_id = s.id 
WHERE e.event_timestamp >= NOW() - INTERVAL '7 days'
ORDER BY e.event_timestamp DESC 
LIMIT 100;

-- =====================================================
-- 5. VERIFICAR INTEGRIDAD DE DATOS
-- =====================================================

-- Asegurar que no hay datos huérfanos después de RLS
SELECT 
  'Orphaned events' as check_name,
  COUNT(*) as count
FROM events e
LEFT JOIN subjects s ON e.subject_id = s.id
WHERE s.id IS NULL;

SELECT 
  'Orphaned actions' as check_name,
  COUNT(*) as count
FROM actions a
LEFT JOIN subjects s ON a.subject_id = s.id
WHERE s.id IS NULL;

SELECT 
  'Orphaned subjects' as check_name,
  COUNT(*) as count
FROM subjects subj
LEFT JOIN families f ON subj.family_id = f.id
WHERE f.id IS NULL;

-- =====================================================
-- 6. RESULTADOS ESPERADOS
-- =====================================================

/*
RESULTADOS ESPERADOS:

1. rls_diagnostic() debería mostrar:
   - Todas las tablas con rls_enabled = true
   - policy_count > 0 para cada tabla

2. Consultas de usuario deberían retornar:
   - Solo datos de familias a las que pertenece el usuario
   - Cero registros de familias ajenas

3. Rendimiento:
   - Las consultas no deberían ser significativamente más lentas
   - Los índices existentes deberían seguir siendo efectivos

4. Funcionalidad:
   - Onboarding debe seguir funcionando
   - Invitaciones por código deben funcionar
   - Real-time subscriptions deben funcionar
   - CRUD de eventos debe funcionar normalmente

NOTAS DE TROUBLESHOOTING:

Si algo no funciona:
1. Verificar que auth.uid() retorna el usuario correcto
2. Verificar que family_members tiene los registros correctos
3. Verificar que las políticas están activas: SELECT * FROM pg_policies;
4. Para debugging temporal, deshabilitar RLS: ALTER TABLE [table] DISABLE ROW LEVEL SECURITY;

ROLLBACK DE EMERGENCIA:
En caso de problemas críticos, ejecutar:

ALTER TABLE families DISABLE ROW LEVEL SECURITY;
ALTER TABLE family_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE actions DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE special_action_configs DISABLE ROW LEVEL SECURITY;

*/