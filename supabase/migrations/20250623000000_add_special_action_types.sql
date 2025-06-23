-- Agregar campo para tipos de acciones especiales
ALTER TABLE actions ADD COLUMN special_type TEXT;

-- Agregar tabla para configuración de acciones especiales
CREATE TABLE special_action_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    action_id UUID REFERENCES actions(id) ON DELETE CASCADE,
    special_type TEXT NOT NULL, -- 'bottle_feeding', 'diaper_change', etc.
    config_data JSONB, -- Configuración específica para cada tipo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_id, action_id)
);

-- Crear índices
CREATE INDEX idx_special_action_configs_family_id ON special_action_configs(family_id);
CREATE INDEX idx_special_action_configs_action_id ON special_action_configs(action_id);
CREATE INDEX idx_special_action_configs_special_type ON special_action_configs(special_type);

-- Agregar campo para datos adicionales en eventos
ALTER TABLE events ADD COLUMN additional_data JSONB;