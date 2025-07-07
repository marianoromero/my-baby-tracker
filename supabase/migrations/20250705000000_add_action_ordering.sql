-- Add action ordering support
-- Add a sort_order column to actions table for user-defined ordering
ALTER TABLE actions ADD COLUMN sort_order INTEGER DEFAULT 0;

-- Create index for better performance when sorting
CREATE INDEX idx_actions_sort_order ON actions(subject_id, sort_order);

-- Update existing actions to have sequential sort_order using CTE
WITH ranked_actions AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY subject_id ORDER BY name) - 1 as new_sort_order
    FROM actions
)
UPDATE actions 
SET sort_order = ranked_actions.new_sort_order
FROM ranked_actions
WHERE actions.id = ranked_actions.id;