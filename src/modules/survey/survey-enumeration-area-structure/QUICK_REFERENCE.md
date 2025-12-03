# Quick Reference: Structures with Household Listings API

## Endpoint
```
GET /survey-enumeration-area-structure/survey-ea/structures/:seaId
```

## What It Does
Returns all structures for a survey enumeration area with household listings grouped by structure.

## Quick Example

### Request
```bash
curl -X GET "http://localhost:3000/survey-enumeration-area-structure/survey-ea/structures/1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Response Structure
```json
[
  {
    "id": 1,
    "structureNumber": "STR-0001",
    "latitude": "27.1234",
    "longitude": "89.5678",
    "householdListings": [
      {
        "id": 1,
        "householdSerialNumber": 1,
        "nameOfHOH": "John Doe",
        "totalMale": 2,
        "totalFemale": 3,
        "submitter": { ... }
      }
    ]
  }
]
```

## Frontend Usage

### React/TypeScript Example
```typescript
interface Structure {
  id: number;
  structureNumber: string;
  latitude: string;
  longitude: string;
  householdListings: HouseholdListing[];
}

interface HouseholdListing {
  id: number;
  householdSerialNumber: number;
  nameOfHOH: string;
  totalMale: number;
  totalFemale: number;
  submitter: User;
}

const fetchStructures = async (seaId: number): Promise<Structure[]> => {
  const response = await fetch(
    `http://localhost:3000/survey-enumeration-area-structure/survey-ea/structures/${seaId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.json();
};

// Usage
const structures = await fetchStructures(1);
structures.forEach(structure => {
  console.log(`Structure ${structure.structureNumber} has ${structure.householdListings.length} households`);
});
```

### Display Grouped by Structure
```tsx
{structures.map(structure => (
  <div key={structure.id}>
    <h3>{structure.structureNumber}</h3>
    {structure.householdListings.map(household => (
      <div key={household.id}>
        {household.nameOfHOH} - {household.totalMale + household.totalFemale} people
      </div>
    ))}
  </div>
))}
```

## Key Features
- ✅ Structures sorted by structureNumber (ASC)
- ✅ Household listings sorted by householdSerialNumber (ASC)
- ✅ Includes submitter information for each household
- ✅ Structures without households return empty array
- ✅ Perfect for grouped display in UI

## Authentication
Requires JWT token with one of: ADMIN, SUPERVISOR, ENUMERATOR roles.

## See Full Documentation
See `API_STRUCTURES_WITH_HOUSEHOLDS.md` for complete API documentation.

