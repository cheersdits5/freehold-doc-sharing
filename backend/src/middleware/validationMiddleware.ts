// Input validation middleware using Joi
// Requirements: 1.2, 1.3, 5.3

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

/**
 * Generic validation middleware factory
 */
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errorDetails,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

/**
 * Login input validation schema
 */
const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .max(255)
    .lowercase()
    .trim()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .min(1)
    .required()
    .messages({
      'string.empty': 'Password is required',
      'any.required': 'Password is required'
    })
});

/**
 * User registration validation schema (for future use)
 */
const registerSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .max(255)
    .lowercase()
    .trim()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password must not exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'string.empty': 'Password is required',
      'any.required': 'Password is required'
    }),
  
  firstName: Joi.string()
    .min(1)
    .max(50)
    .required()
    .trim()
    .pattern(/^[a-zA-Z\s'-]+$/)
    .messages({
      'string.min': 'First name is required',
      'string.max': 'First name must not exceed 50 characters',
      'string.pattern.base': 'First name can only contain letters, spaces, hyphens, and apostrophes',
      'string.empty': 'First name is required',
      'any.required': 'First name is required'
    }),
  
  lastName: Joi.string()
    .min(1)
    .max(50)
    .required()
    .trim()
    .pattern(/^[a-zA-Z\s'-]+$/)
    .messages({
      'string.min': 'Last name is required',
      'string.max': 'Last name must not exceed 50 characters',
      'string.pattern.base': 'Last name can only contain letters, spaces, hyphens, and apostrophes',
      'string.empty': 'Last name is required',
      'any.required': 'Last name is required'
    }),
  
  role: Joi.string()
    .valid('member', 'admin')
    .default('member')
    .messages({
      'any.only': 'Role must be either "member" or "admin"'
    })
});

/**
 * File upload validation schema
 */
const fileUploadSchema = Joi.object({
  categoryId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': 'Category ID must be a valid UUID'
    }),
  
  description: Joi.string()
    .max(500)
    .optional()
    .trim()
    .allow('')
    .messages({
      'string.max': 'Description must not exceed 500 characters'
    }),
  
  tags: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().trim().max(50)).max(10),
      Joi.string().custom((value, helpers) => {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            return parsed;
          }
          return [value];
        } catch {
          return [value];
        }
      })
    )
    .optional()
    .messages({
      'array.max': 'Maximum 10 tags allowed',
      'string.max': 'Each tag must not exceed 50 characters'
    })
});

/**
 * File update validation schema
 */
const fileUpdateSchema = Joi.object({
  fileName: Joi.string()
    .min(1)
    .max(255)
    .optional()
    .trim()
    .messages({
      'string.empty': 'File name cannot be empty',
      'string.max': 'File name must not exceed 255 characters'
    }),
  
  categoryId: Joi.string()
    .uuid()
    .optional()
    .allow(null)
    .messages({
      'string.guid': 'Category ID must be a valid UUID'
    }),
  
  description: Joi.string()
    .max(500)
    .optional()
    .trim()
    .allow('')
    .messages({
      'string.max': 'Description must not exceed 500 characters'
    }),
  
  tags: Joi.array()
    .items(Joi.string().trim().max(50))
    .max(10)
    .optional()
    .messages({
      'array.max': 'Maximum 10 tags allowed',
      'string.max': 'Each tag must not exceed 50 characters'
    })
});

/**
 * Custom validation middleware for file uploads
 */
export const validateFileUpload = (req: any, res: any, next: any): void => {
  // First validate the file itself
  if (!req.file) {
    res.status(400).json({
      error: {
        code: 'NO_FILE',
        message: 'No file provided',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  // Validate file size (already handled by multer, but double-check)
  if (req.file.size > 50 * 1024 * 1024) {
    res.status(400).json({
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'File size exceeds 50MB limit',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  // Validate file name
  if (!req.file.originalname || req.file.originalname.trim().length === 0) {
    res.status(400).json({
      error: {
        code: 'INVALID_FILE_NAME',
        message: 'File must have a valid name',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  // Enhanced file name validation
  const fileName = req.file.originalname;
  
  // Check for dangerous file extensions
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar', '.sh'];
  const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  
  if (dangerousExtensions.includes(fileExtension)) {
    res.status(400).json({
      error: {
        code: 'DANGEROUS_FILE_TYPE',
        message: 'File type not allowed for security reasons',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  // Check for suspicious file names
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /[<>:"|?*]/,  // Invalid filename characters
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i,  // Windows reserved names
  ];

  if (suspiciousPatterns.some(pattern => pattern.test(fileName))) {
    res.status(400).json({
      error: {
        code: 'INVALID_FILE_NAME',
        message: 'File name contains invalid characters',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  // Validate file name length
  if (fileName.length > 255) {
    res.status(400).json({
      error: {
        code: 'FILE_NAME_TOO_LONG',
        message: 'File name exceeds maximum length of 255 characters',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  // Validate body data
  const { error, value } = fileUploadSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorDetails = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid upload data',
        details: errorDetails,
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  req.body = value;
  next();
};

/**
 * Category creation validation schema
 */
const categoryCreateSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(100)
    .required()
    .trim()
    .messages({
      'string.empty': 'Category name is required',
      'string.max': 'Category name must not exceed 100 characters',
      'any.required': 'Category name is required'
    }),
  
  description: Joi.string()
    .max(500)
    .optional()
    .trim()
    .allow('')
    .messages({
      'string.max': 'Description must not exceed 500 characters'
    })
});

/**
 * Category update validation schema
 */
const categoryUpdateSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(100)
    .optional()
    .trim()
    .messages({
      'string.empty': 'Category name cannot be empty',
      'string.max': 'Category name must not exceed 100 characters'
    }),
  
  description: Joi.string()
    .max(500)
    .optional()
    .trim()
    .allow('')
    .messages({
      'string.max': 'Description must not exceed 500 characters'
    })
});

/**
 * Validation middleware for file updates
 */
export const validateFileUpdate = validate(fileUpdateSchema);

/**
 * Validation middleware for category creation
 */
export const validateCategoryCreate = validate(categoryCreateSchema);

/**
 * Validation middleware for category updates
 */
export const validateCategoryUpdate = validate(categoryUpdateSchema);

// Export specific validation middleware
export const validateLoginInput = validate(loginSchema);
export const validateRegisterInput = validate(registerSchema);
export const validateFileUploadInput = validate(fileUploadSchema);

// Export schemas for testing
export { loginSchema, registerSchema, fileUploadSchema, fileUpdateSchema, categoryCreateSchema, categoryUpdateSchema };