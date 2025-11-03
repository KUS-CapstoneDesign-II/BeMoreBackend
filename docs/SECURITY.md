# 🛡️ BeMore Backend - Security Policy

## Overview

BeMore Backend implements defense-in-depth security measures to protect user data and system integrity.

---

## Security Best Practices Implemented

### 🔐 Authentication & Authorization

- [x] JWT token validation (`optionalJwtAuth` middleware)
- [x] Request ID tracking for audit trails
- [x] Secure token storage requirements in client

### 🔒 Network Security

**CORS (Cross-Origin Resource Sharing)**
```javascript
// Whitelist specific origins
allowedOrigins: [
  'http://localhost:5173',
  'https://be-more-frontend.vercel.app',
  // Environment variable support for custom origins
]
```

**Helmet Security Headers**
```javascript
// Content Security Policy
// X-Frame-Options: DENY
// X-Content-Type-Options: nosniff
// X-XSS-Protection enabled
```

**HTTPS/TLS**
- ✅ Enforced on production (Render, Vercel)
- ✅ Secure cookie flags (when implemented)

### 🚀 Rate Limiting

**Global Rate Limiter** (10 min window)
- GET/other: 600 requests per IP
- POST/PUT/DELETE: 300 requests per IP

```javascript
// Configuration in app.js
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
});
```

### 📊 Data Protection

**Request Size Limits**
- JSON payload: 1MB limit
- Prevents denial-of-service via large payloads

**Request Validation**
- Zod schema validation on all API inputs
- Type checking with TypeScript

**Logging & Monitoring**
- Request logging via Morgan middleware
- Request ID correlation for tracing
- Error tracking via Sentry (frontend)

### 🔧 Infrastructure Security

**Environment Variables**
- ✅ API keys in `.env` (not committed)
- ✅ Database credentials not exposed
- ✅ Port configuration via ENV

**Database Security**
- ✅ Sequelize ORM prevents SQL injection
- ✅ Parameterized queries enforced
- ✅ Connection pooling for stability

**Error Handling**
- ✅ Generic error messages to clients
- ✅ Detailed errors logged internally only
- ✅ Stack traces not exposed in production

### 🐳 Container Security

**Docker**
```dockerfile
# Non-root user (when implemented)
# Minimal base image
# Read-only filesystem (production)
```

### 🚨 Error Handling

**ErrorHandler System**
```javascript
class ErrorHandler {
  handle(error, context) {
    // Log with full context
    // Send safe response to client
    // Track error statistics
  }
}
```

---

## Dependency Security

### Dependency Audit

Run periodic security audits:

```bash
# Check for vulnerabilities
npm audit

# Update if needed (carefully)
npm audit fix

# Force update (breaking changes possible)
npm audit fix --force
```

### Critical Dependencies

| Package | Purpose | Security Status |
|---------|---------|-----------------|
| express | Web framework | ✅ Maintained |
| jsonwebtoken | JWT handling | ✅ Maintained |
| helmet | Security headers | ✅ Maintained |
| sequelize | ORM | ✅ Maintained |
| @google/generative-ai | AI API client | ✅ Maintained |
| openai | STT/TTS | ✅ Maintained |

### Dependency Update Policy

1. **Security Updates**: Apply immediately
2. **Minor Updates**: Apply weekly/monthly
3. **Major Updates**: Test thoroughly before applying
4. **Beta/Dev Dependencies**: Only for development

---

## API Security

### Endpoint Protection

**Public Endpoints** (no auth)
- `GET /health` - Status check
- `GET /` - Root status
- `GET /api/errors/stats` - Error statistics (monitoring only)

**Protected Endpoints** (JWT optional)
- `/api/session/*` - Session management
- `/api/stt/*` - Speech-to-text
- `/api/dashboard/*` - Dashboard
- `/api/user/*` - User information

### Validation

**Zod Schemas**
```typescript
// Example validation
const SessionStartSchema = z.object({
  userId: z.string().min(1),
  counselorId: z.string().min(1),
});
```

### Rate Limiting Tiers

| Tier | Requests | Window | Purpose |
|------|----------|--------|---------|
| Global | 600 | 10 min | General traffic |
| Write (POST/PUT/DELETE) | 300 | 10 min | Protect mutations |
| WebSocket | Per-connection | Session | Real-time data |

---

## Data Privacy

### Sensitive Data Handling

**Personal Information**
- [ ] User profile data (name, email)
- [ ] Session records (timestamps, content)
- [ ] Counseling notes (transcripts, analysis)

**Encryption** (Recommended)
- [ ] At-rest encryption for database
- [ ] In-transit encryption (TLS/HTTPS)

### Data Retention

- Session data: [Define retention period]
- Temporary files: Cleaned up on session end (see `tempFileCleanup`)
- Logs: 30 days retention (configurable)

### GDPR/Privacy Compliance

- [ ] User consent management
- [ ] Data export functionality
- [ ] Account deletion procedures
- [ ] Privacy policy linked

---

## Deployment Security Checklist

Before each production deployment:

- [ ] Run `npm audit` - no critical/high severity issues
- [ ] Review environment variables - all secrets set
- [ ] Check CORS origins - production URLs only
- [ ] Verify rate limiting - active
- [ ] Test error handling - no sensitive data exposed
- [ ] Check logs - no credentials logged
- [ ] SSL/TLS certificate valid
- [ ] Database credentials rotated
- [ ] Backup strategy verified
- [ ] Rollback plan prepared

---

## Monitoring & Alerting

### Health Checks

```bash
# Check server health
curl https://api.bemore.dev/health

# Expected response
{
  "status": "ok",
  "uptime": 12345,
  "version": "1.0.0"
}
```

### Error Monitoring

```bash
# View error statistics
curl https://api.bemore.dev/api/errors/stats
```

### Log Analysis

Monitor for:
- ❌ Repeated 401 errors (auth issues)
- ❌ Repeated 429 errors (rate limit breaches)
- ❌ Repeated 500 errors (server errors)
- ❌ Unusual request patterns

---

## Testing Security

### Security Test Checklist

- [ ] OWASP Top 10 assessment
- [ ] SQL injection tests (ORM prevents)
- [ ] XSS prevention (API doesn't render HTML)
- [ ] CSRF protection (token validation)
- [ ] Rate limit verification
- [ ] Authentication bypass attempts
- [ ] Authorization boundary testing
- [ ] Sensitive data exposure checks

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express.js Security](https://expressjs.com/en/advanced/best-practice-security.html)
- [Node.js Security Checklist](https://nodejs.org/en/docs/guides/security/)
- [npm Security](https://docs.npmjs.com/cli/v10/commands/npm-audit)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-24 | Initial security policy |

---

**Last Updated**: 2025-11-03
**Next Review**: 2025-12-03 (Monthly)

> 📌 **Internal Security Issues?** See `SECURITY_INTERNAL.md` (not in public repo)
