// Database query utilities and common queries
// Requirements: 1.2, 2.6, 3.4 (database operations)

import { QueryResult } from 'pg';
import { db } from './connection';

/**
 * Base repository class with common database operations
 */
export abstract class BaseRepository {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  /**
   * Find a record by ID
   */
  protected async findById<T>(id: string): Promise<T | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
    const result = await db.query<T>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find records with conditions
   */
  protected async findWhere<T>(
    conditions: Record<string, any>,
    orderBy?: string,
    limit?: number,
    offset?: number
  ): Promise<T[]> {
    const whereClause = Object.keys(conditions)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(' AND ');
    
    let query = `SELECT * FROM ${this.tableName}`;
    if (whereClause) {
      query += ` WHERE ${whereClause}`;
    }
    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    }
    if (limit) {
      query += ` LIMIT ${limit}`;
    }
    if (offset) {
      query += ` OFFSET ${offset}`;
    }

    const values = Object.values(conditions);
    const result = await db.query<T>(query, values);
    return result.rows;
  }

  /**
   * Count records with conditions
   */
  protected async countWhere(conditions: Record<string, any>): Promise<number> {
    const whereClause = Object.keys(conditions)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(' AND ');
    
    let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    if (whereClause) {
      query += ` WHERE ${whereClause}`;
    }

    const values = Object.values(conditions);
    const result = await db.query<{ count: string }>(query, values);
    return parseInt(result.rows[0].count);
  }

  /**
   * Insert a new record
   */
  protected async insert<T>(data: Record<string, any>): Promise<T> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    
    const query = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;
    
    const result = await db.query<T>(query, values);
    return result.rows[0];
  }

  /**
   * Update a record by ID
   */
  protected async updateById<T>(
    id: string, 
    data: Record<string, any>
  ): Promise<T | null> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns
      .map((col, index) => `${col} = $${index + 2}`)
      .join(', ');
    
    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await db.query<T>(query, [id, ...values]);
    return result.rows[0] || null;
  }

  /**
   * Delete a record by ID
   */
  protected async deleteById(id: string): Promise<boolean> {
    const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
    const result = await db.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Check if a record exists
   */
  protected async exists(conditions: Record<string, any>): Promise<boolean> {
    const count = await this.countWhere(conditions);
    return count > 0;
  }
}

/**
 * Query builder for complex queries
 */
export class QueryBuilder {
  private selectClause: string = '*';
  private fromClause: string = '';
  private joinClauses: string[] = [];
  private whereConditions: string[] = [];
  private orderByClause: string = '';
  private limitClause: string = '';
  private offsetClause: string = '';
  private parameters: any[] = [];

  select(columns: string): QueryBuilder {
    this.selectClause = columns;
    return this;
  }

  from(table: string): QueryBuilder {
    this.fromClause = table;
    return this;
  }

  leftJoin(table: string, condition: string): QueryBuilder {
    this.joinClauses.push(`LEFT JOIN ${table} ON ${condition}`);
    return this;
  }

  innerJoin(table: string, condition: string): QueryBuilder {
    this.joinClauses.push(`INNER JOIN ${table} ON ${condition}`);
    return this;
  }

  where(condition: string, value?: any): QueryBuilder {
    if (value !== undefined) {
      this.parameters.push(value);
      const paramIndex = this.parameters.length;
      this.whereConditions.push(condition.replace('?', `$${paramIndex}`));
    } else {
      this.whereConditions.push(condition);
    }
    return this;
  }

  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilder {
    this.orderByClause = `ORDER BY ${column} ${direction}`;
    return this;
  }

  limit(count: number): QueryBuilder {
    this.limitClause = `LIMIT ${count}`;
    return this;
  }

  offset(count: number): QueryBuilder {
    this.offsetClause = `OFFSET ${count}`;
    return this;
  }

  build(): { query: string; parameters: any[] } {
    let query = `SELECT ${this.selectClause} FROM ${this.fromClause}`;
    
    if (this.joinClauses.length > 0) {
      query += ` ${this.joinClauses.join(' ')}`;
    }
    
    if (this.whereConditions.length > 0) {
      query += ` WHERE ${this.whereConditions.join(' AND ')}`;
    }
    
    if (this.orderByClause) {
      query += ` ${this.orderByClause}`;
    }
    
    if (this.limitClause) {
      query += ` ${this.limitClause}`;
    }
    
    if (this.offsetClause) {
      query += ` ${this.offsetClause}`;
    }

    return { query, parameters: this.parameters };
  }

  async execute<T>(): Promise<QueryResult<T>> {
    const { query, parameters } = this.build();
    return db.query<T>(query, parameters);
  }
}

/**
 * Utility functions for common database operations
 */
export const dbUtils = {
  /**
   * Convert camelCase to snake_case for database columns
   */
  toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  },

  /**
   * Convert snake_case to camelCase for JavaScript objects
   */
  toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  },

  /**
   * Convert object keys from camelCase to snake_case
   */
  toDbObject(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[this.toSnakeCase(key)] = value;
    }
    return result;
  },

  /**
   * Convert object keys from snake_case to camelCase
   */
  fromDbObject(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[this.toCamelCase(key)] = value;
    }
    return result;
  },

  /**
   * Generate UUID for new records
   */
  generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};