// Authentication service for user login and JWT token management
// Requirements: 1.1, 1.2, 1.3, 1.4, 1.5

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../database/connection';
import { 
  User, 
  UserRow, 
  LoginCredentials, 
  AuthResponse, 
  UserInfo 
} from '../models/User';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface TokenValidationResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
}

export class AuthService {
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRES_IN: string;
  private readonly REFRESH_TOKEN_EXPIRES_IN: string;
  private readonly SALT_ROUNDS: number = 12;

  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
    this.REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

    if (!process.env.JWT_SECRET) {
      console.warn('JWT_SECRET not set in environment variables. Using default (not secure for production)');
    }
  }

  /**
   * Hash a password using bcrypt
   */
  public async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, this.SALT_ROUNDS);
    } catch (error) {
      console.error('Error hashing password:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify a password against its hash
   */
  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  /**
   * Generate JWT token for a user
   */
  public generateToken(user: UserInfo): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
      issuer: 'freehold-docs',
      audience: 'freehold-members'
    });
  }

  /**
   * Generate refresh token for a user
   */
  public generateRefreshToken(user: UserInfo): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
      issuer: 'freehold-docs',
      audience: 'freehold-members'
    });
  }

  /**
   * Validate JWT token and return payload
   */
  public validateToken(token: string): TokenValidationResult {
    try {
      const payload = jwt.verify(token, this.JWT_SECRET, {
        issuer: 'freehold-docs',
        audience: 'freehold-members'
      }) as JWTPayload;

      return {
        valid: true,
        payload
      };
    } catch (error) {
      let errorMessage = 'Invalid token';
      
      if (error instanceof jwt.TokenExpiredError) {
        errorMessage = 'Token expired';
      } else if (error instanceof jwt.JsonWebTokenError) {
        errorMessage = 'Malformed token';
      }

      return {
        valid: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get user by email from database
   */
  private async getUserByEmail(email: string): Promise<UserRow | null> {
    try {
      const query = `
        SELECT id, email, password_hash, first_name, last_name, role, is_active, 
               created_at, updated_at, last_login
        FROM users 
        WHERE email = $1 AND is_active = true
      `;
      
      const result = await db.query<UserRow>(query, [email.toLowerCase()]);
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      throw new Error('Database error during user lookup');
    }
  }

  /**
   * Update user's last login timestamp
   */
  private async updateLastLogin(userId: string): Promise<void> {
    try {
      const query = `
        UPDATE users 
        SET last_login = NOW(), updated_at = NOW()
        WHERE id = $1
      `;
      
      await db.query(query, [userId]);
    } catch (error) {
      console.error('Error updating last login:', error);
      // Don't throw error as this is not critical for login process
    }
  }

  /**
   * Convert UserRow to User object (excluding password_hash)
   */
  private userRowToUser(userRow: UserRow): User {
    return {
      id: userRow.id,
      email: userRow.email,
      firstName: userRow.first_name,
      lastName: userRow.last_name,
      role: userRow.role,
      isActive: userRow.is_active,
      createdAt: userRow.created_at,
      updatedAt: userRow.updated_at,
      lastLogin: userRow.last_login
    };
  }

  /**
   * Convert User to UserInfo (for JWT payload)
   */
  private userToUserInfo(user: User): UserInfo {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role
    };
  }

  /**
   * Authenticate user with email and password
   */
  public async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { email, password } = credentials;

    // Validate input
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    if (!email.includes('@')) {
      throw new Error('Invalid email format');
    }

    try {
      // Get user from database
      const userRow = await this.getUserByEmail(email);
      
      if (!userRow) {
        throw new Error('Invalid credentials');
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(password, userRow.password_hash);
      
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      // Convert to User object
      const user = this.userRowToUser(userRow);
      const userInfo = this.userToUserInfo(user);

      // Generate tokens
      const token = this.generateToken(userInfo);
      const refreshToken = this.generateRefreshToken(userInfo);

      // Update last login
      await this.updateLastLogin(user.id);

      return {
        user,
        token,
        refreshToken
      };
    } catch (error) {
      console.error('Login error:', error);
      
      // Don't expose internal errors to client
      if (error instanceof Error && error.message === 'Invalid credentials') {
        throw error;
      }
      
      throw new Error('Authentication failed');
    }
  }

  /**
   * Get user info from valid JWT token
   */
  public async getUserFromToken(token: string): Promise<UserInfo> {
    const validation = this.validateToken(token);
    
    if (!validation.valid || !validation.payload) {
      throw new Error(validation.error || 'Invalid token');
    }

    // Verify user still exists and is active
    const userRow = await this.getUserByEmail(validation.payload.email);
    
    if (!userRow) {
      throw new Error('User not found or inactive');
    }

    const user = this.userRowToUser(userRow);
    return this.userToUserInfo(user);
  }

  /**
   * Refresh JWT token using refresh token
   */
  public async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const validation = this.validateToken(refreshToken);
    
    if (!validation.valid || !validation.payload) {
      throw new Error('Invalid refresh token');
    }

    // Get current user data
    const userRow = await this.getUserByEmail(validation.payload.email);
    
    if (!userRow) {
      throw new Error('User not found or inactive');
    }

    const user = this.userRowToUser(userRow);
    const userInfo = this.userToUserInfo(user);

    // Generate new tokens
    const newToken = this.generateToken(userInfo);
    const newRefreshToken = this.generateRefreshToken(userInfo);

    return {
      user,
      token: newToken,
      refreshToken: newRefreshToken
    };
  }
}

// Export singleton instance
export const authService = new AuthService();