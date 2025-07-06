-- Add action ordering support
-- Add a sort_order column to actions table for user-defined ordering
ALTER TABLE actions ADD COLUMN sort_order INTEGER DEFAULT 0;

-- Create index for better performance when sorting
CREATE INDEX idx_actions_sort_order ON actions(subject_id, sort_order);

-- Update existing actions to have sequential sort_order based on current alphabetical order
DO $$
DECLARE
    action_record RECORD;
    counter INTEGER;
BEGIN
    -- For each subject, set sort_order based on current alphabetical ordering
    FOR action_record IN 
        SELECT DISTINCT subject_id FROM actions
    LOOP
        counter := 0;
        UPDATE actions 
        SET sort_order = counter + row_number() OVER (ORDER BY name)
        WHERE subject_id = action_record.subject_id;
    END LOOP;
END $$;