-- Seed: 1 Structure (lat/long 27.534570, 89.646255) + 10 Households (dummy: Yeshi Choden, 17446355, male 1 female 2)
-- enumerationAreaId = 2. Set userId to your enumerator id if not 1.
-- PostgreSQL: double-quoted identifiers.

-- 1) Insert one structure and capture its id
WITH new_structure AS (
  INSERT INTO "Structures" ("enumerationAreaId", "structureNumber", "latitude", "longitude", "createdAt", "updatedAt")
  VALUES (2, '1', 27.534570, 89.646255, NOW(), NOW())
  RETURNING id
),
-- 2) Insert 10 households for that structure (userId = 1 = enumerator; change if needed)
household_rows AS (
  SELECT
    (SELECT id FROM new_structure) AS "structureId",
    1 AS "userId",
    'HH-' || n AS "householdIdentification",
    n AS "householdSerialNumber",
    'Yeshi Choden' AS "nameOfHOH",
    1 AS "totalMale",
    2 AS "totalFemale",
    '17446355' AS "phoneNumber",
    'Dummy seed' AS "remarks",
    NOW() AS "createdAt",
    NOW() AS "updatedAt"
  FROM generate_series(1, 10) AS n
)
INSERT INTO "HouseholdListings" ("structureId", "userId", "householdIdentification", "householdSerialNumber", "nameOfHOH", "totalMale", "totalFemale", "phoneNumber", "remarks", "createdAt", "updatedAt")
SELECT "structureId", "userId", "householdIdentification", "householdSerialNumber", "nameOfHOH", "totalMale", "totalFemale", "phoneNumber", "remarks", "createdAt", "updatedAt"
FROM household_rows;
