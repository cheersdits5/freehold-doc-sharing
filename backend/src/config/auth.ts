// Authentication configuration
// Requirements: 1.4, 1.5, 5.3

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
  bcryptSaltRounds: number;
  rateLimitMaxAttempts: number;
  rateLimitWindowMs: number;
  sessionCookieMaxAge: number;
}

/**
 * Load authentication configuration from environment variables
 */
export const getAuthConfig = (): AuthConfig => {
  return {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12'),
    rateLimitMaxAttempts: parseInt(process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS || '5'),
    rateLimitWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    sessionCookieMaxAge: parseInt(process.env.SESSION_COOKIE_MAX_AGE || '604800000') // 7 days
  };
};

/**
 * Validate authentication configuration
 */
export const validateAuthConfig = (config: AuthConfig): void => {
  if (!config.jwtSecret || config.jwtSecret === 'your-secret-key-change-in-production') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production environment');
    }
    console.warn('⚠️  Using default JWT_SECRET. This is not secure for production!');
  }

  if (config.jwtSecret.length < 32) {
    console.warn('⚠️  JWT_SECRET should be at least 32 characters long for security');
  }

  if (config.bcryptSaltRounds < 10) {
    console.warn('⚠️  BCRYPT_SALT_ROUNDS should be at least 10 for security');
  }

  if (config.bcryptSaltRounds > 15) {
    console.warn('⚠️  BCRYPT_SALT_ROUNDS is very high, this may impact performance');
  }
};

// Export default configuration
export const authConfig = getAuthConfig();

// Validate configuration on module load
validateAuthConfig(authConfig);