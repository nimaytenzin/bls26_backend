/**
 * Pagination Query DTO
 * Use this interface for pagination query parameters
 */
export interface PaginationQueryDto {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Pagination Metadata
 * Contains information about the pagination state
 */
export interface PaginationMeta {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Paginated Response
 * Generic interface for paginated API responses
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Pagination Options
 * Internal options for pagination utility
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Pagination Utility Class
 * Provides helper methods for handling pagination across all modules
 *
 * @example
 * // In a service
 * import { PaginationUtil } from '../../common/utils/pagination.util';
 *
 * async findAll(query: PaginationQueryDto) {
 *   const options = PaginationUtil.normalizePaginationOptions(query);
 *   const { offset, limit } = PaginationUtil.calculateOffsetLimit(options);
 *
 *   const { rows, count } = await this.repository.findAndCountAll({
 *     offset,
 *     limit,
 *     order: PaginationUtil.buildOrderClause(options),
 *   });
 *
 *   return PaginationUtil.createPaginatedResponse(rows, count, options);
 * }
 */
export class PaginationUtil {
  // Default pagination values
  static readonly DEFAULT_PAGE = 1;
  static readonly DEFAULT_LIMIT = 10;
  static readonly MAX_LIMIT = 100;
  static readonly DEFAULT_SORT_ORDER: 'ASC' | 'DESC' = 'DESC';

  /**
   * Normalize pagination options with defaults and validation
   * @param query - Query parameters from request
   * @returns Normalized pagination options
   */
  static normalizePaginationOptions(
    query: PaginationQueryDto = {},
  ): PaginationOptions {
    const page = Math.max(1, Number(query.page) || this.DEFAULT_PAGE);
    const limit = Math.min(
      this.MAX_LIMIT,
      Math.max(1, Number(query.limit) || this.DEFAULT_LIMIT),
    );
    const sortBy = query.sortBy;
    const sortOrder = query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    return {
      page,
      limit,
      sortBy,
      sortOrder,
    };
  }

  /**
   * Calculate offset and limit for database queries
   * @param options - Normalized pagination options
   * @returns Object with offset and limit
   */
  static calculateOffsetLimit(options: PaginationOptions): {
    offset: number;
    limit: number;
  } {
    const offset = (options.page - 1) * options.limit;
    return {
      offset,
      limit: options.limit,
    };
  }

  /**
   * Build ORDER BY clause for Sequelize queries
   * @param options - Normalized pagination options
   * @param defaultSortBy - Default field to sort by if not specified
   * @returns Array for Sequelize order clause
   */
  static buildOrderClause(
    options: PaginationOptions,
    defaultSortBy: string = 'id',
  ): any[] {
    const sortBy = options.sortBy || defaultSortBy;
    const sortOrder = options.sortOrder || this.DEFAULT_SORT_ORDER;
    return [[sortBy, sortOrder]];
  }

  /**
   * Create pagination metadata
   * @param totalItems - Total number of items in database
   * @param options - Pagination options
   * @returns Pagination metadata
   */
  static createPaginationMeta(
    totalItems: number,
    options: PaginationOptions,
  ): PaginationMeta {
    const totalPages = Math.ceil(totalItems / options.limit);
    const currentPage = options.page;

    return {
      currentPage,
      itemsPerPage: options.limit,
      totalItems,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    };
  }

  /**
   * Create complete paginated response
   * @param data - Array of items for current page
   * @param totalItems - Total number of items in database
   * @param options - Pagination options
   * @returns Paginated response with data and metadata
   */
  static createPaginatedResponse<T>(
    data: T[],
    totalItems: number,
    options: PaginationOptions,
  ): PaginatedResponse<T> {
    return {
      data,
      meta: this.createPaginationMeta(totalItems, options),
    };
  }

  /**
   * Validate page number
   * @param page - Page number to validate
   * @param totalPages - Total number of pages
   * @returns True if page is valid
   */
  static isValidPage(page: number, totalPages: number): boolean {
    return page >= 1 && page <= totalPages;
  }

  /**
   * Get next page number
   * @param currentPage - Current page number
   * @param totalPages - Total number of pages
   * @returns Next page number or null if on last page
   */
  static getNextPage(currentPage: number, totalPages: number): number | null {
    return currentPage < totalPages ? currentPage + 1 : null;
  }

  /**
   * Get previous page number
   * @param currentPage - Current page number
   * @returns Previous page number or null if on first page
   */
  static getPreviousPage(currentPage: number): number | null {
    return currentPage > 1 ? currentPage - 1 : null;
  }
}
