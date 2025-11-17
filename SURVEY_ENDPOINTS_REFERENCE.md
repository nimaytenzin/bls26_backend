# Survey Module - New Endpoints Quick Reference

## New Endpoints Added

### 1. Get All Active Surveys (No Pagination)

**Endpoint:** `GET /survey/active`

**Description:** Returns all surveys with status ACTIVE

**Authentication:** None (Public)

**Query Parameters:** None

**Response:**
```json
[
  {
    "id": 1,
    "name": "National Population and Housing Census 2025",
    "description": "Complete population count",
    "year": 2025,
    "status": "ACTIVE",
    "startDate": "2025-01-01T00:00:00.000Z",
    "endDate": "2025-12-31T00:00:00.000Z",
    "enumerationAreas": [...]
  }
]
```

**Example Usage:**
```bash
curl -X GET http://localhost:3000/survey/active
```

---

### 2. Get Paginated Surveys

**Endpoint:** `GET /survey/paginated`

**Description:** Returns paginated surveys with metadata

**Authentication:** None (Public)

**Query Parameters:**
- `page` (optional, number) - Page number (default: 1)
- `limit` (optional, number) - Items per page (default: 10, max: 100)
- `sortBy` (optional, string) - Field to sort by (default: 'startDate')
- `sortOrder` (optional, string) - Sort order: ASC or DESC (default: DESC)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "National Population and Housing Census 2025",
      "description": "Complete population count",
      "year": 2025,
      "status": "ACTIVE",
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-12-31T00:00:00.000Z",
      "enumerationAreas": [...]
    }
  ],
  "meta": {
    "currentPage": 1,
    "itemsPerPage": 10,
    "totalItems": 25,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

**Example Usage:**
```bash
# Get first page (default 10 items)
curl -X GET http://localhost:3000/survey/paginated

# Get page 2 with 20 items
curl -X GET "http://localhost:3000/survey/paginated?page=2&limit=20"

# Sort by name ascending
curl -X GET "http://localhost:3000/survey/paginated?sortBy=name&sortOrder=ASC"

# Page 3, 25 items, sorted by year
curl -X GET "http://localhost:3000/survey/paginated?page=3&limit=25&sortBy=year&sortOrder=ASC"
```

---

## Existing Endpoint (Unchanged)

### Get All Surveys (No Pagination)

**Endpoint:** `GET /survey`

**Description:** Returns all surveys without pagination

**Response:** Array of all surveys

---

## Common Pagination Utility

### Location
`/src/common/utils/pagination.util.ts`

### Can Be Used In Any Module

The `PaginationUtil` class is a reusable utility for implementing pagination across all modules.

**Key Features:**
- ✅ Automatic validation and defaults
- ✅ Offset/limit calculation
- ✅ Metadata generation
- ✅ Sorting support
- ✅ Type-safe TypeScript interfaces

**Example Usage in Other Modules:**
```typescript
import { PaginationUtil, PaginationQueryDto, PaginatedResponse } from '../../common/utils/pagination.util';

async findAllPaginated(query: PaginationQueryDto): Promise<PaginatedResponse<YourEntity>> {
  const options = PaginationUtil.normalizePaginationOptions(query);
  const { offset, limit } = PaginationUtil.calculateOffsetLimit(options);
  const order = PaginationUtil.buildOrderClause(options, 'id');
  
  const { rows, count } = await this.repository.findAndCountAll({
    offset,
    limit,
    order,
  });
  
  return PaginationUtil.createPaginatedResponse(rows, count, options);
}
```

### Default Configuration
- Default page: 1
- Default limit: 10
- Max limit: 100
- Default sort order: DESC

---

## Files Created/Modified

**Created:**
1. `/src/common/utils/pagination.util.ts` - Pagination utility class
2. `/PAGINATION_UTILITY_GUIDE.md` - Comprehensive usage guide
3. `/SURVEY_ENDPOINTS_REFERENCE.md` - This file

**Modified:**
1. `survey.service.ts` - Added `findAllActive()` and `findAllPaginated()` methods
2. `survey.controller.ts` - Added `/active` and `/paginated` endpoints

---

## Testing

```bash
# Test active surveys
curl -X GET http://localhost:3000/survey/active

# Test pagination - page 1
curl -X GET http://localhost:3000/survey/paginated

# Test pagination - page 2, 20 items
curl -X GET "http://localhost:3000/survey/paginated?page=2&limit=20"

# Test sorting
curl -X GET "http://localhost:3000/survey/paginated?sortBy=name&sortOrder=ASC"
```

---

## Next Steps

To add pagination to other modules (e.g., Dzongkhag, AZ, SAZ):

1. Import the pagination utility
2. Add a `findAllPaginated()` method to the service
3. Add a `GET /paginated` endpoint to the controller
4. Follow the patterns in `PAGINATION_UTILITY_GUIDE.md`

Refer to the comprehensive guide for detailed examples and best practices.

