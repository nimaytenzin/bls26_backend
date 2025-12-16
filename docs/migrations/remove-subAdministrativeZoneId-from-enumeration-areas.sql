-- Migration: Remove subAdministrativeZoneId column from EnumerationAreas table
-- Date: 2025-12-15
-- Description: This migration removes the old subAdministrativeZoneId column from EnumerationAreas
--              table since we've moved to a many-to-many relationship via junction table.

-- Step 1: Make the column nullable first (if it exists and is NOT NULL)
ALTER TABLE "EnumerationAreas" 
ALTER COLUMN "subAdministrativeZoneId" DROP NOT NULL;

-- Step 2: Drop the foreign key constraint (if it exists)
-- Note: Replace 'fk_enumeration_areas_sub_administrative_zone_id' with the actual constraint name
-- You can find the constraint name by running:
-- SELECT constraint_name 
-- FROM information_schema.table_constraints 
-- WHERE table_name = 'EnumerationAreas' 
-- AND constraint_type = 'FOREIGN KEY'
-- AND constraint_name LIKE '%subAdministrativeZoneId%';

-- Example (uncomment and adjust constraint name):
-- ALTER TABLE "EnumerationAreas" 
-- DROP CONSTRAINT IF EXISTS fk_enumeration_areas_sub_administrative_zone_id;

-- Step 3: Drop the column entirely
ALTER TABLE "EnumerationAreas" 
DROP COLUMN IF EXISTS "subAdministrativeZoneId";

-- Step 4: Verify the column has been removed
-- SELECT column_name 
-- FROM information_schema.columns 
-- WHERE table_name = 'EnumerationAreas' 
-- AND column_name = 'subAdministrativeZoneId';
-- Should return 0 rows

