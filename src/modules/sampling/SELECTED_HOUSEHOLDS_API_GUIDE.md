# Selected Households API Guide

## Overview

This API endpoint returns a simple array of household listing IDs that were selected for a survey enumeration area. This is used by the UI to mark/highlight which households were selected in the household listing table.

## Endpoint

```
GET /sampling/surveys/:surveyId/enumeration-areas/:seaId/selected-households
```

### Authentication
- **Required**: Yes (JWT Token)
- **Roles**: `ADMIN`, `SUPERVISOR`

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `surveyId` | number | Yes | The survey ID |
| `seaId` | number | Yes | The survey enumeration area ID |

### Example Request

```http
GET /sampling/surveys/7/enumeration-areas/45/selected-households
Authorization: Bearer <your-jwt-token>
```

## Response Format

### Success Response (200 OK)

Returns a simple array of household listing IDs, ordered by selection order:

```json
[5001, 5005, 5012, 5018, 5023, 5029, 5035, 5041, 5047, 5053, 5059, 5065]
```

### No Sampling Found

If no sampling exists for the enumeration area, the endpoint returns an empty array:

```json
[]
```

This is not an error - it simply means sampling hasn't been run yet for this enumeration area.

## Response Details

- **Type**: `number[]` - Array of household listing IDs
- **Order**: IDs are returned in selection order (ascending by `selectionOrder`)
- **Empty Array**: Returns `[]` if no households were selected (should not happen for valid sampling)

## Frontend Usage

### Use Case: Marking Selected Households in UI

This endpoint is designed to help you:
1. **Highlight selected households** in a household listing table
2. **Filter to show only selected households**
3. **Check if a specific household is selected**

### Implementation Example

#### TypeScript Interface

```typescript
// Simple array of household listing IDs
type SelectedHouseholdIds = number[];
```

#### Angular/React Service Example

```typescript
// sampling.service.ts
async getSelectedHouseholdIds(
  surveyId: number, 
  surveyEnumerationAreaId: number
): Promise<number[]> {
  const response = await this.http.get<number[]>(
    `/sampling/surveys/${surveyId}/enumeration-areas/${surveyEnumerationAreaId}/selected-households`
  ).toPromise();
  return response;
}
```

#### Component Usage

```typescript
// component.ts
selectedHouseholdIds: Set<number> = new Set();

async loadSelectedHouseholds(surveyId: number, surveyEnumerationAreaId: number) {
  try {
    const householdIds = await this.samplingService.getSelectedHouseholdIds(
      surveyId,
      surveyEnumerationAreaId
    );
    
    // Store selected household IDs in a Set for O(1) lookup
    this.selectedHouseholdIds = new Set(householdIds);
    
    if (householdIds.length > 0) {
      console.log(`Loaded ${householdIds.length} selected household IDs`);
    } else {
      console.log('No sampling found for this enumeration area');
    }
  } catch (error) {
    console.error('Failed to load selected households:', error);
  }
}

// Check if a household is selected
isHouseholdSelected(householdId: number): boolean {
  return this.selectedHouseholdIds.has(householdId);
}
```

#### Template Example (Angular)

```html
<!-- Household listing table -->
<table>
  <thead>
    <tr>
      <th>Serial #</th>
      <th>Structure #</th>
      <th>Head of Household</th>
      <th>Population</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr 
      *ngFor="let household of households"
      [class.selected]="isHouseholdSelected(household.id)"
    >
      <td>{{ household.householdSerialNumber }}</td>
      <td>{{ household.structureNumber }}</td>
      <td>{{ household.nameOfHOH }}</td>
      <td>{{ household.totalPopulation }}</td>
      <td>
        <span 
          *ngIf="isHouseholdSelected(household.id)"
          class="badge badge-primary"
        >
          Selected
        </span>
      </td>
    </tr>
  </tbody>
</table>
```

#### CSS Example

```css
/* Highlight selected households */
tr.selected {
  background-color: #e3f2fd;
  border-left: 4px solid #2196f3;
}

tr.selected:hover {
  background-color: #bbdefb;
}

/* Badge for selected status */
.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.badge-primary {
  background-color: #2196f3;
  color: white;
}
```

## Workflow Integration

### Typical Workflow

1. **User views household listings** for a survey enumeration area
   - You already have `surveyId` and `surveyEnumerationAreaId` from the current context

2. **Call this endpoint** to get selected household IDs:
   - `GET /sampling/surveys/:surveyId/enumeration-areas/:seaId/selected-households`
   - Store the returned array of IDs in a `Set` for efficient lookup
   - Use it to mark/highlight selected households in your table

3. **If user runs sampling**:
   - `POST /sampling/surveys/:surveyId/enumeration-areas/:seaId/run`
   - After successful sampling, refresh the selected household IDs by calling this endpoint again

## Error Handling

### 404 Not Found
- **Cause**: The sampling ID doesn't exist
- **Action**: Verify the sampling ID is correct, or check if sampling was deleted

### 401 Unauthorized
- **Cause**: Missing or invalid JWT token
- **Action**: Ensure user is authenticated

### 403 Forbidden
- **Cause**: User doesn't have `ADMIN` or `SUPERVISOR` role
- **Action**: Check user permissions

### Example Error Handling

```typescript
async loadSelectedHouseholds(samplingId: number) {
  try {
    const response = await this.samplingService.getSelectedHouseholds(samplingId);
    this.selectedHouseholds = response.data.selectedHouseholds;
  } catch (error) {
    if (error.status === 404) {
      this.showMessage('Sampling not found. It may have been deleted.');
    } else if (error.status === 401) {
      this.router.navigate(['/login']);
    } else if (error.status === 403) {
      this.showMessage('You do not have permission to view selected households.');
    } else {
      this.showMessage('Failed to load selected households. Please try again.');
    }
  }
}
```

## Performance Considerations

- **Efficient Lookup**: Store the array in a `Set` for O(1) lookup when checking if a household is selected
- **Caching**: Consider caching the response if household listings don't change frequently
- **Lazy Loading**: Load selected household IDs only when needed (e.g., when user views the household listing table)

## Related Endpoints

- `GET /sampling/surveys/:surveyId/enumeration-areas/:seaId/results` - Get full sampling results (includes detailed household information)
- `GET /sampling/surveys/:surveyId/enumeration-areas/:seaId/check` - Check if sampling exists
- `POST /sampling/surveys/:surveyId/enumeration-areas/:seaId/run` - Run sampling

## Notes

- **Ordering**: IDs are returned in selection order (ascending by `selectionOrder`)
- **Simple Response**: This endpoint returns only IDs for efficient marking/highlighting. Use `/results` endpoint if you need full household details
- **Empty Array**: Returns `[]` if no sampling exists for the enumeration area (sampling hasn't been run yet)
- **No Error on Missing Sampling**: Unlike other endpoints, this returns an empty array instead of throwing an error when sampling doesn't exist

