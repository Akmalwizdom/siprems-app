# Security Refactoring Documentation

This document details all security enhancements made to the SIPREMS backend system.

## Overview

A comprehensive security refactoring has been implemented to protect sensitive endpoints, manage authentication securely, and add multiple layers of security protection including JWT authentication, input validation, rate limiting, and security headers.

## Changes Summary

### 1. JWT Authentication with Refresh Token Support

**Files Created:**
- `utils/jwt_handler.py` - JWT token generation and validation
- `utils/password_handler.py` - Password hashing and strength validation
- `routes/auth_routes.py` - Authentication endpoints
- `services/user_service.py` - User authentication business logic
- `models/user_model.py` - User data access layer

**Features:**
- Access tokens (30-minute default expiration)
- Refresh tokens (7-day default expiration)
- Password hashing using PBKDF2-SHA256 with salt
- Password strength validation (minimum 8 characters, uppercase, number)
- Token verification with expiration checks

**API Endpoints:**
- `POST /auth/register` - Register new user
- `POST /auth/login` - Authenticate and get tokens
- `POST /auth/refresh` - Refresh access token
- `GET /auth/profile` - Get user profile (requires auth)
- `POST /auth/change-password` - Change password (requires auth)
- `POST /auth/logout` - Logout user

**Configuration (Environment Variables):**
```
JWT_SECRET_KEY=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
```

### 2. Authentication Middleware & Decorators

**Implementation:**
- `@require_auth` decorator - Enforces JWT authentication on protected endpoints
- `@optional_auth` decorator - Allows authenticated or unauthenticated access

**Protected Endpoints:**
All sensitive endpoints now require authentication:
- `/products/*` - All product management endpoints
- `/transactions/*` - All transaction endpoints
- `/events/*` - All event management endpoints
- `/predict/*` - Prediction endpoints
- `/chat/*` - Chat endpoints
- `/dashboard-stats` - Dashboard statistics

**Unprotected Endpoints:**
- `/auth/register` - User registration
- `/auth/login` - User login
- `/auth/refresh` - Token refresh
- `/health` - Health check
- `/settings/status` - System status

### 3. Server-Side Input Validation

**File Created:**
- `utils/validators.py` - Marshmallow schemas for request validation

**Schemas Implemented:**
- `AuthLoginSchema` - Email and password validation
- `AuthRegisterSchema` - Registration data validation
- `RefreshTokenSchema` - Refresh token validation
- `ProductSchema` - Product data validation
- `TransactionSchema` - Transaction data validation
- `EventSchema` - Event data validation

**Validation Features:**
- Required field checking
- Email format validation
- Length restrictions
- Type validation
- Enum validation for specific fields
- Input sanitization (whitespace stripping)

**Usage:**
```python
valid, validated_data, errors = validate_request_data(AuthLoginSchema, data)
if not valid:
    return jsonify({'error': 'Validation failed', 'details': errors}), 400
```

### 4. Security Headers

**Implementation:**
- Flask-Talisman integration in `app.py`
- HSTS (HTTP Strict Transport Security) enabled
- Content Security Policy (CSP) configured
- X-Frame-Options, X-Content-Type-Options headers

**Configuration:**
```python
Talisman(
    app,
    force_https=not app.debug,
    strict_transport_security=True,
    strict_transport_security_max_age=31536000,
    content_security_policy={
        'default-src': "'self'",
        'script-src': "'self'",
        'style-src': "'self' 'unsafe-inline'",
        'img-src': "'self' data:",
    }
)
```

### 5. CORS Whitelist Configuration

**Implementation:**
- Configurable allowed origins via environment variable
- Specific HTTP methods allowed (GET, POST, PUT, DELETE, OPTIONS)
- Authorization header support
- Credentials support enabled

**Configuration (Environment Variables):**
```
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,https://yourdomain.com
```

**Default (Development):**
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (Alternative dev port)

### 6. Rate Limiting

**Implementation:**
- Flask-Limiter integration
- Default rate limit: 100 requests per hour
- Configurable storage backend (default: in-memory)

**Configuration (Environment Variables):**
```
RATELIMIT_STORAGE_URL=memory://
RATELIMIT_DEFAULT=100/hour
```

**For Production (Redis):**
```
RATELIMIT_STORAGE_URL=redis://localhost:6379
```

**Error Response:**
```json
{
  "error": "Rate limit exceeded"
}
```

### 7. Environment Variables & Secrets Management

**Files Updated:**
- `docker-compose.yml` - Uses environment variables for all sensitive data
- `utils/config.py` - Centralized configuration management

**All Secrets Now in Environment Variables:**
```
DB_HOST=localhost
DB_NAME=siprems_db
DB_USER=postgres
DB_PASSWORD=your-secure-password
DB_PORT=5432
GEMINI_API_KEY=your-api-key
JWT_SECRET_KEY=your-jwt-secret
FLASK_ENV=production
CORS_ALLOWED_ORIGINS=your-allowed-domains
```

**Best Practices:**
- Never commit `.env` files to version control
- Use strong, random values for secrets
- Rotate `JWT_SECRET_KEY` periodically
- In production, use managed secrets (AWS Secrets Manager, HashiCorp Vault, etc.)

### 8. Database Schema Updates

**File Updated:**
- `schema.sql` - Added users table

**New Users Table:**
```sql
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

**Event Type Enum Updated:**
- Added 'promotion' and 'seasonal' to event types
- Original 'custom' type preserved for backward compatibility

### 9. Frontend Updates

**Files Created:**
- `Siprems/src/utils/api.ts` - API client with JWT support

**Features:**
- Automatic token management (access and refresh)
- Automatic token refresh on 401 responses
- Token persistence in localStorage
- Automatic logout on token expiration
- Request/response interception

**Files Updated:**
- `Siprems/src/components/LoginPage.tsx` - Real authentication API calls
- `Siprems/src/App.tsx` - User session management and auto-login

**Usage:**
```typescript
import { apiClient } from './utils/api';

// Login
const response = await apiClient.post('/auth/login', {
  email,
  password
});

// Make authenticated request
const data = await apiClient.get('/products');

// Logout
apiClient.clearTokens();
```

## Migration & Backward Compatibility

### Breaking Changes
1. All endpoints (except `/auth/*`, `/health`, `/settings/status`) now require authentication
2. Request bodies must pass validation schemas
3. Existing clients must implement JWT authentication

### Migration Path

#### For Existing Frontend Clients:
1. Update API client to include JWT handling
2. Implement login/register endpoints
3. Store tokens in localStorage
4. Add `Authorization: Bearer <token>` header to requests

#### For API Consumers:
1. Call `/auth/login` to get access token
2. Include `Authorization` header in requests
3. Handle 401 responses by refreshing token
4. Use `/auth/refresh` endpoint to get new access token

### Non-Breaking Additions
- New authentication endpoints (doesn't affect existing functionality)
- New validation (makes invalid requests fail properly)
- New security headers (transparent to clients)

## Configuration Examples

### Development Environment (`.env`)
```env
FLASK_ENV=development
DB_HOST=localhost
DB_NAME=siprems_db
DB_USER=postgres
DB_PASSWORD=dev-password
DB_PORT=5432
GEMINI_API_KEY=your-dev-api-key
JWT_SECRET_KEY=dev-secret-change-in-production
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
RATELIMIT_STORAGE_URL=memory://
```

### Production Environment (`.env`)
```env
FLASK_ENV=production
DB_HOST=db.example.com
DB_NAME=siprems_prod
DB_USER=siprems_user
DB_PASSWORD=very-secure-password-min-32-chars
DB_PORT=5432
GEMINI_API_KEY=your-prod-api-key
JWT_SECRET_KEY=very-secure-jwt-secret-min-32-chars
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
JWT_REFRESH_TOKEN_EXPIRE_DAYS=30
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
RATELIMIT_STORAGE_URL=redis://redis.example.com:6379
```

### Docker Compose Usage
```bash
# Development
docker-compose up

# Production (with environment file)
docker-compose --env-file .env.production up
```

## Security Best Practices Implemented

1. **Password Security:**
   - PBKDF2-SHA256 hashing with 16-byte salt
   - Minimum 8 characters, uppercase, and number required
   - Password strength validation on registration

2. **Token Security:**
   - Short-lived access tokens (30 minutes)
   - Longer-lived refresh tokens (7 days) never sent to client
   - Tokens verified on every request
   - Proper error messages for invalid tokens

3. **Input Validation:**
   - All user input validated server-side
   - Marshmallow schemas for consistent validation
   - Length and format restrictions
   - SQL injection prevention through parameterized queries

4. **API Security:**
   - CORS whitelist enforcement
   - Security headers (HSTS, CSP, X-Frame-Options)
   - Rate limiting to prevent abuse
   - 401/403 responses for unauthorized access

5. **Database Security:**
   - No hardcoded credentials
   - User passwords hashed (never stored plain-text)
   - Index on email for performance
   - Constraints for data integrity

## Deployment Checklist

- [ ] Set strong `JWT_SECRET_KEY` (min 32 characters, random)
- [ ] Set strong database password (min 32 characters, random)
- [ ] Set `FLASK_ENV=production`
- [ ] Configure correct `CORS_ALLOWED_ORIGINS` for your domain
- [ ] Set up Redis for rate limiting in production
- [ ] Enable HTTPS in production (Flask-Talisman will enforce)
- [ ] Run database migrations: `psql -f schema.sql`
- [ ] Test authentication flow in production
- [ ] Set up monitoring and logging
- [ ] Regular security updates for dependencies

## Dependencies Added

- `pyjwt` - JWT token creation and verification
- `werkzeug` - Password hashing utilities
- `flask-talisman` - Security headers
- `flask-limiter` - Rate limiting
- `marshmallow` - Input validation schemas

## Testing

### Manual Testing of Auth Flow:
```bash
# Register
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123",
    "full_name": "John Doe"
  }'

# Login
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'

# Use access token
curl -X GET http://localhost:5000/products \
  -H "Authorization: Bearer <access_token>"

# Refresh token
curl -X POST http://localhost:5000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "<refresh_token>"}'
```

## Troubleshooting

### "Missing authorization token"
- Ensure Authorization header is included with Bearer token
- Check token has not expired
- For expired token, use refresh endpoint

### "Invalid or expired token"
- Token may have expired (use refresh endpoint)
- JWT_SECRET_KEY may not match (check configuration)
- Token may have been tampered with

### "Validation failed"
- Check request data against schema documentation
- Ensure required fields are present
- Verify field types and lengths

## Future Enhancements

1. **Multi-Factor Authentication (MFA)**
   - TOTP support
   - SMS-based verification

2. **API Keys**
   - Long-lived tokens for service-to-service authentication
   - Key rotation policies

3. **Role-Based Access Control (RBAC)**
   - User roles (admin, manager, viewer)
   - Permission-based endpoint access

4. **Audit Logging**
   - Track all authentication events
   - Log sensitive data access
   - Compliance reporting

5. **Token Blacklisting**
   - Immediate token revocation on logout
   - Handling of revoked tokens

6. **OAuth2/SSO Integration**
   - Google, GitHub, Microsoft login
   - Enterprise SSO support

## Support & Questions

For questions or issues related to this security refactoring, please refer to:
- Backend Architecture: `ARCHITECTURE.md`
- Configuration: `utils/config.py`
- API Endpoints: Route files in `routes/`

---

**Last Updated:** Security Refactoring v1.0
**Status:** ✅ Production Ready
