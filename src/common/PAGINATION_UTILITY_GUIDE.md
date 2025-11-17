# Pagination Utility - Usage Guide

## Overview

The `PaginationUtil` class provides a standardized way to implement pagination across all modules in the application. It handles common pagination tasks like offset calculation, response formatting, and metadata generation.

## Location

```
/src/common/utils/pagination.util.ts
```

## Features

✅ **Consistent Pagination**: Uniform pagination across all API endpoints
✅ **Type Safety**: Full TypeScript support with interfaces
✅ **Configurable Defaults**: Customizable default values
✅ **Metadata Generation**: Automatic generation of pagination metadata
✅ **Validation**: Built-in validation for page numbers and limits
✅ **Sorting Support**: Easy integration of sorting functionality

---

## Installation

The utility is already created at `/src/common/utils/pagination.util.ts`. Simply import it in your service:

```typescript
import { PaginationUtil, PaginationQueryDto, PaginatedResponse } from '../../../common/utils/pagination.util';
```

---

## Configuration

### Default Values

```typescript
PaginationUtil.DEFAULT_PAGE = 1;        // Default page number
PaginationUtil.DEFAULT_LIMIT = 10;      // Default items per page
PaginationUtil.MAX_LIMIT = 100;         // Maximum items per page
PaginationUtil.DEFAULT_SORT_ORDER = 'DESC';
```

---

## Interfaces

### PaginationQueryDto

Use this interface for controller query parameters:

```typescript
interface PaginationQueryDto {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}
```

### PaginatedResponse<T>

The standard paginated response structure:

```typescript
interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

interface PaginationMeta {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
```

---

## Usage Examples

### 1. Basic Pagination in Service

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { PaginationUtil, PaginationQueryDto, PaginatedResponse } from '../../../common/utils/pagination.util';
import { Survey } from './entities/survey.entity';

@Injectable()
export class SurveyService {
  constructor(
    @Inject('SURVEY_REPOSITORY')
    private readonly surveyRepository: typeof Survey,
  ) {}

  async findAllPaginated(query: PaginationQueryDto): Promise<PaginatedResponse<Survey>> {
    // Step 1: Normalize pagination options
    const options = PaginationUtil.normalizePaginationOptions(query);

    // Step 2: Calculate offset and limit
    const { offset, limit } = PaginationUtil.calculateOffsetLimit(options);

    // Step 3: Build order clause (default sort by 'startDate')
    const order = PaginationUtil.buildOrderClause(options, 'startDate');

    // Step 4: Fetch data with count
    const { rows, count } = await this.surveyRepository.findAndCountAll({
      offset,
      limit,
      order,
      include: ['enumerationAreas'], // Optional includes
    });

    // Step 5: Return paginated response
    return PaginationUtil.createPaginatedResponse(rows, count, options);
  }
}
```

### 2. Controller Implementation

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { SurveyService } from './survey.service';
import { PaginationQueryDto } from '../../../common/utils/pagination.util';

@Controller('survey')
export class SurveyController {
  constructor(private readonly surveyService: SurveyService) {}

  /**
   * Get paginated surveys
   * @query page - Page number (default: 1)
   * @query limit - Items per page (default: 10, max: 100)
   * @query sortBy - Field to sort by (default: 'startDate')
   * @query sortOrder - Sort order: ASC or DESC (default: DESC)
   */
  @Get('paginated')
  async findAllPaginated(@Query() query: PaginationQueryDto) {
    return this.surveyService.findAllPaginated(query);
  }
}
```

### 3. Advanced Usage with Filters

```typescript
async findAllPaginated(
  query: PaginationQueryDto,
  filters?: { status?: string; year?: number }
): Promise<PaginatedResponse<Survey>> {
  const options = PaginationUtil.normalizePaginationOptions(query);
  const { offset, limit } = PaginationUtil.calculateOffsetLimit(options);
  const order = PaginationUtil.buildOrderClause(options, 'createdAt');

  // Build where clause with filters
  const where: any = {};
  if (filters?.status) where.status = filters.status;
  if (filters?.year) where.year = filters.year;

  const { rows, count } = await this.repository.findAndCountAll({
    where,
    offset,
    limit,
    order,
  });

  return PaginationUtil.createPaginatedResponse(rows, count, options);
}
```

### 4. Multiple Sort Fields

```typescript
async findAllPaginated(query: PaginationQueryDto): Promise<PaginatedResponse<Survey>> {
  const options = PaginationUtil.normalizePaginationOptions(query);
  const { offset, limit } = PaginationUtil.calculateOffsetLimit(options);

  // Custom multi-field sorting
  const order = options.sortBy 
    ? [[options.sortBy, options.sortOrder]]
    : [['priority', 'DESC'], ['createdAt', 'DESC']];

  const { rows, count } = await this.repository.findAndCountAll({
    offset,
    limit,
    order,
  });

  return PaginationUtil.createPaginatedResponse(rows, count, options);
}
```

---

## API Request Examples

### Basic Pagination

```bash
# Get first page (default 10 items)
GET /survey/paginated

# Get page 2 with 20 items
GET /survey/paginated?page=2&limit=20

# Get page 1 with maximum items (100)
GET /survey/paginated?page=1&limit=100
```

### With Sorting

```bash
# Sort by name ascending
GET /survey/paginated?sortBy=name&sortOrder=ASC

# Sort by startDate descending (default)
GET /survey/paginated?sortBy=startDate&sortOrder=DESC

# Page 3, 25 items, sorted by year ascending
GET /survey/paginated?page=3&limit=25&sortBy=year&sortOrder=ASC
```

---

## API Response Example

```json
{
  "data": [
    {
      "id": 1,
      "name": "National Population and Housing Census 2025",
      "year": 2025,
      "status": "ACTIVE",
      "startDate": "2025-01-01",
      "endDate": "2025-12-31",
      "enumerationAreas": [...]
    },
    {
      "id": 2,
      "name": "Survey 2024",
      "year": 2024,
      "status": "ENDED",
      "startDate": "2024-01-01",
      "endDate": "2024-12-31",
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

---

## Helper Methods Reference

### normalizePaginationOptions(query)

Validates and normalizes pagination parameters.

```typescript
const options = PaginationUtil.normalizePaginationOptions({
  page: 2,
  limit: 50,
  sortBy: 'name',
  sortOrder: 'ASC'
});
// Returns: { page: 2, limit: 50, sortBy: 'name', sortOrder: 'ASC' }
```

### calculateOffsetLimit(options)

Calculates database offset and limit.

```typescript
const { offset, limit } = PaginationUtil.calculateOffsetLimit({
  page: 3,
  limit: 10
});
// Returns: { offset: 20, limit: 10 }
```

### buildOrderClause(options, defaultSortBy)

Builds Sequelize ORDER BY clause.

```typescript
const order = PaginationUtil.buildOrderClause(
  { sortBy: 'name', sortOrder: 'ASC' },
  'id'
);
// Returns: [['name', 'ASC']]
```

### createPaginatedResponse(data, totalItems, options)

Creates complete paginated response with metadata.

```typescript
const response = PaginationUtil.createPaginatedResponse(
  rows,
  count,
  options
);
// Returns: { data: [...], meta: {...} }
```

---

## Integration in Other Modules

### Example: Dzongkhag Module

```typescript
// dzongkhag.service.ts
import { PaginationUtil, PaginationQueryDto, PaginatedResponse } from '../../common/utils/pagination.util';

async findAllPaginated(query: PaginationQueryDto): Promise<PaginatedResponse<Dzongkhag>> {
  const options = PaginationUtil.normalizePaginationOptions(query);
  const { offset, limit } = PaginationUtil.calculateOffsetLimit(options);
  const order = PaginationUtil.buildOrderClause(options, 'name');

  const { rows, count } = await this.dzongkhagRepository.findAndCountAll({
    offset,
    limit,
    order,
    attributes: { exclude: ['geom'] }, // Exclude large geometry
  });

  return PaginationUtil.createPaginatedResponse(rows, count, options);
}
```

```typescript
// dzongkhag.controller.ts
@Get('paginated')
async findAllPaginated(@Query() query: PaginationQueryDto) {
  return this.dzongkhagService.findAllPaginated(query);
}
```

---

## Best Practices

1. **Always use normalizePaginationOptions()**: It validates and applies defaults
2. **Exclude large fields**: Don't paginate geometry or large text fields
3. **Provide default sortBy**: Each entity should have a logical default sort field
4. **Document query parameters**: Use JSDoc comments in controllers
5. **Consistent naming**: Use `findAllPaginated` for paginated endpoints
6. **Consider performance**: Add database indexes on commonly sorted fields

---

## Survey Module Implementation

The Survey module now has three endpoints:

### 1. Get All Surveys (No Pagination)
```
GET /survey
```
Returns all surveys without pagination.

### 2. Get Active Surveys (No Pagination)
```
GET /survey/active
```
Returns all surveys with status ACTIVE.

### 3. Get Paginated Surveys
```
GET /survey/paginated?page=1&limit=10&sortBy=startDate&sortOrder=DESC
```
Returns paginated surveys with metadata.

---

## Error Handling

The utility automatically handles:
- ✅ Negative page numbers → Defaults to page 1
- ✅ Limits exceeding MAX_LIMIT → Caps at 100
- ✅ Invalid sort orders → Defaults to DESC
- ✅ Zero or negative limits → Defaults to 10

---

## Migration Guide for Existing Modules

To add pagination to an existing module:

1. **Import the utility**:
   ```typescript
   import { PaginationUtil, PaginationQueryDto, PaginatedResponse } from '../../common/utils/pagination.util';
   ```

2. **Add service method**:
   ```typescript
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

3. **Add controller endpoint**:
   ```typescript
   @Get('paginated')
   async findAllPaginated(@Query() query: PaginationQueryDto) {
     return this.service.findAllPaginated(query);
   }
   ```

Done! Your module now supports pagination.

