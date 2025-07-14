-- Permitir que action_id sea NULL para configuraciones globales de familia
-- Esto permite tener configuraciones de campos especiales a nivel de familia
-- sin estar vinculadas a acciones específicas

-- Primero eliminar la restricción UNIQUE existente
ALTER TABLE special_action_configs DROP CONSTRAINT IF EXISTS special_action_configs_family_id_action_id_key;

-- Modificar action_id para permitir NULL
ALTER TABLE special_action_configs ALTER COLUMN action_id DROP NOT NULL;

-- Crear nueva restricción UNIQUE que considere family_id, special_type (y action_id cuando no sea NULL)
-- Esto permite múltiples configuraciones por familia/tipo pero solo una por familia/tipo/acción
ALTER TABLE special_action_configs 
ADD CONSTRAINT special_action_configs_unique_family_type 
UNIQUE (family_id, special_type, action_id);

-- Agregar índice para consultas por family_id y special_type
CREATE INDEX IF NOT EXISTS idx_special_action_configs_family_type 
ON special_action_configs(family_id, special_type);