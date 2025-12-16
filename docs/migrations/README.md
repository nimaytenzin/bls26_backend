# Database Migrations

## Migration: Remove subAdministrativeZoneId from EnumerationAreas

### Issue
The `EnumerationAreas` table still has a `subAdministrativeZoneId` column with a NOT NULL constraint, but the application code has been updated to use a junction table instead. This causes errors when creating new Enumeration Areas.

### Solution
Run the migration script to remove the old column.

### Quick Fix

**Option 1: Run SQL directly (Recommended)**

Connect to your PostgreSQL database and run:

```sql
-- Make column nullable first
ALTER TABLE "EnumerationAreas" 
ALTER COLUMN "subAdministrativeZoneId" DROP NOT NULL;

-- Drop the column
ALTER TABLE "EnumerationAreas" 
DROP COLUMN IF EXISTS "subAdministrativeZoneId";
```

**Option 2: Use the migration script**

Run the SQL file: `docs/migrations/remove-subAdministrativeZoneId-from-enumeration-areas.sql`

### Verification

After running the migration, verify the column is removed:

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'EnumerationAreas' 
AND column_name = 'subAdministrativeZoneId';
```

Should return 0 rows.

### Important Notes

- **Backup your database** before running migrations
- The junction table (`EnumerationAreaSubAdministrativeZones`) should already exist
- Existing data relationships should be migrated to the junction table if needed
- After migration, the `POST /enumeration-area` endpoint will work correctly

