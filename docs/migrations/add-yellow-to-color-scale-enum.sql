-- Migration: Add 'yellow' to colorScale enum
-- Run this SQL script to update the PostgreSQL enum type

-- Add 'yellow' to the enum_public_page_settings_colorScale enum type
ALTER TYPE enum_public_page_settings_colorScale ADD VALUE IF NOT EXISTS 'yellow';

-- Note: IF NOT EXISTS is available in PostgreSQL 9.5+
-- For older versions, you may need to check if the value exists first:
-- DO $$ BEGIN
--     IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'yellow' AND enumtypid = 'enum_public_page_settings_colorScale'::regtype) THEN
--         ALTER TYPE enum_public_page_settings_colorScale ADD VALUE 'yellow';
--     END IF;
-- END $$;

