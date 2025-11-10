# 🔧 BeMore Backend - Maintenance Guide

## Overview

This guide documents maintenance procedures, monitoring, and system health management for BeMore Backend.

---

## 📊 System Monitoring

### Health Check Endpoint

Monitor server health in real-time:

```bash
curl https://api.bemore.dev/health

# Response
{
  "status": "ok",
  "timestamp": "2025-10-24T17:45:00.000Z",
  "uptime": 123456,
  "version": "1.0.0",
  "commit": "abc1234def567"
}
```

### Error Tracking

**View error statistics:**
```bash
curl https://api.bemore.dev/api/errors/stats
```

**View recent errors (limited to 20):**
```bash
curl "https://api.bemore.dev/api/monitoring/recent-errors?limit=20"
```

**View errors by category:**
```bash
curl "https://api.bemore.dev/api/monitoring/errors/WEBSOCKET"
```

Categories: WEBSOCKET, SESSION, STT, VAD, GEMINI, CBT, DATABASE, NETWORK

---

## 🗑️ Temporary File Cleanup

### Overview

Automatic cleanup service prevents disk space exhaustion by removing temporary audio files.

**Default Configuration:**
- Delete files older than **7 days**
- Delete oldest files if `/tmp` exceeds **500MB**
- Run cleanup checks every **60 minutes**

### Configuration

Edit `.env` to customize:

```env
# Days: files older than this are deleted
TEMP_FILE_MAX_AGE_DAYS=7

# Size: if /tmp exceeds this, oldest files are deleted
TEMP_FILE_MAX_SIZE_MB=500

# Frequency: how often to check for cleanup
TEMP_CLEANUP_INTERVAL_MIN=60
```

### Monitoring Cleanup Status

**View cleanup statistics:**
```bash
curl https://api.bemore.dev/api/system/temp-cleanup-stats

# Response
{
  "success": true,
  "data": {
    "filesDeleted": 42,
    "bytesFreed": "5.23",
    "checksRun": 8,
    "lastCheckTime": "2025-10-24T17:30:00.000Z",
    "errors": 0
  }
}
```

### Manual Cleanup

For production systems, you can manually trigger cleanup:

```bash
# SSH into server
ssh user@production.bemore.dev

# Check tmp directory size
du -sh /path/to/app/tmp

# List oldest files
ls -ltrh /path/to/app/tmp | head -20

# Remove specific files (careful!)
rm /path/to/app/tmp/old_file.wav
```

---

## 🔐 Security Maintenance

### Regular Security Audits

**Weekly:**
```bash
npm audit
```

**Monthly:**
- Run full npm audit with detailed report
- Review and update critical vulnerabilities
- Test security patches in staging
- Deploy to production if verified

### Dependency Updates

**Check for updates:**
```bash
npm outdated
```

**Safe update strategy:**
1. Update minor/patch versions first
2. Run full test suite
3. Deploy to staging environment
4. Monitor for 24 hours
5. Deploy to production

**Example:**
```bash
# Check updates
npm outdated

# Install updates carefully
npm install
npm audit

# Test
npm test
```

### Known Vulnerabilities

**Current Status:**
- validator.js URL validation bypass (Indirect via Sequelize)
- Status: Not exploitable in our code
- Monitoring: Sequelize releases for patched validator versions

See [docs/SECURITY.md](./docs/SECURITY.md) for full vulnerability assessment.

---

## 📈 Performance Monitoring

### Key Metrics to Monitor

1. **Response Times**
   - API endpoints: Target <200ms
   - WebSocket messages: Target <100ms
   - STT processing: Target <5s

2. **Error Rates**
   - Target: <0.1% error rate
   - Alert: >1% error rate within 5 min window

3. **Resource Usage**
   - Memory: Target <500MB (development), <1GB (production)
   - CPU: Target <30% average
   - Disk: Monitor /tmp growth

4. **WebSocket Connections**
   - Monitor active connections
   - Alert on unexpected disconnections
   - Log session duration

### Monitoring Tools

**Server Logs:**
```bash
# Development
npm run dev 2>&1 | grep ERROR

# Production (via provider)
# Render: Dashboard → Logs
# Vercel: Dashboard → Logs
```

**Error Tracking:**
```bash
# Internal
curl https://api.bemore.dev/api/errors/stats

# Sentry (for frontend)
https://sentry.io/organizations/bemore/
```

---

## 🚀 Deployment Procedures

### Pre-Deployment Checklist

Before deploying to production:

- [ ] Run `npm audit` - no critical/high issues
- [ ] Run `npm test` - all tests passing
- [ ] Review git diff vs main branch
- [ ] Check environment variables are set
- [ ] Verify rate limiting configuration
- [ ] Test CORS with production frontend URL
- [ ] Backup database (if applicable)
- [ ] Prepare rollback plan

### Deployment Commands

**Via Git (CI/CD Automatic):**
```bash
git push origin woo

# CI/CD automatically:
# 1. Runs tests
# 2. Builds Docker image
# 3. Deploys to production
```

**Manual Deployment:**
```bash
# Render
git push origin woo  # Automatic via webhook

# Vercel (for frontend)
git push origin main
```

### Post-Deployment Verification

After deployment:

```bash
# 1. Health check
curl https://api.bemore.dev/health

# 2. Error rate
curl https://api.bemore.dev/api/errors/stats

# 3. Test API
curl -X POST https://api.bemore.dev/api/session/start \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","counselorId":"test"}'

# 4. Monitor logs
# Check provider dashboard for errors
```

---

## 🔄 Common Maintenance Tasks

### Update Dependencies

```bash
# Check for updates
npm outdated

# Update all (carefully)
npm install

# Audit again
npm audit

# Test
npm test

# Commit if all good
git add package*.json
git commit -m "chore: update dependencies"
```

### Review and Rotate Logs

**Development:**
```bash
# Logs are on stderr/stdout
# Save to file
npm run dev > app.log 2>&1
```

**Production:**
```bash
# Via provider (Render, Vercel)
# Check dashboard logs
# Download for analysis if needed
```

### Database Maintenance

If using MySQL:

```bash
# Connect to database
mysql -h host -u user -p

# Check table sizes
SELECT table_name, ROUND(((data_length + index_length) / 1024 / 1024), 2) MB
FROM information_schema.TABLES
WHERE table_schema = 'bemore'
ORDER BY MB DESC;

# Optimize tables
OPTIMIZE TABLE User;
OPTIMIZE TABLE Session;
```

### Monitor Disk Space

```bash
# Check disk usage
df -h

# Check /tmp usage
du -sh /path/to/app/tmp

# If cleanup isn't working, manually clean
find /path/to/app/tmp -type f -mtime +7 -delete
```

---

## 📋 Incident Response

### When Something Goes Wrong

**1. Identify the Problem**
```bash
# Check health
curl https://api.bemore.dev/health

# Check errors
curl https://api.bemore.dev/api/errors/stats

# Check logs
# Provider dashboard → Logs tab
```

**2. Quick Diagnostics**

For high error rate:
```bash
# View recent errors
curl "https://api.bemore.dev/api/monitoring/recent-errors?limit=50"

# View errors by type
curl https://api.bemore.dev/api/monitoring/errors/WEBSOCKET
```

For disk space issue:
```bash
# Check /tmp size
du -sh /path/to/app/tmp

# Check what's taking space
ls -lrh /path/to/app/tmp | tail -20

# Manually cleanup if needed
find /path/to/app/tmp -type f -delete
```

For memory issue:
```bash
# Restart server
# Via provider dashboard or:
git push origin woo  # Trigger redeploy
```

**3. Temporary Mitigation**

- Scale up resources (if using Render/Heroku)
- Disable non-critical features temporarily
- Enable read-only mode if database is problematic
- Route traffic to backup server

**4. Root Cause Analysis**

- Review logs for patterns
- Check recent deployments
- Review recent code changes
- Check external API status (Gemini, OpenAI, etc.)
- Monitor metrics during incident

**5. Resolution & Prevention**

- Fix the issue
- Deploy patch
- Monitor closely for 24h
- Document in incident log
- Implement prevention measures

---

## 📅 Maintenance Schedule

### Daily
- Monitor health check endpoint
- Review error statistics
- Check server logs

### Weekly
- Run npm audit
- Review performance metrics
- Check disk space usage

### Monthly
- Full security audit
- Update dependencies (if safe)
- Review and optimize slow endpoints
- Database maintenance

### Quarterly
- Security assessment
- Performance optimization
- Documentation review
- Team training on procedures

---

## 📞 Escalation Path

### Issue Severity Levels

| Level | Response Time | Examples |
|-------|---------------|----------|
| Critical | 15 min | Service down, data loss, security breach |
| High | 1 hour | High error rate (>5%), slowness |
| Medium | 4 hours | Non-critical bugs, performance issues |
| Low | 24 hours | Documentation, minor improvements |

### Contact List

- **On-Call Engineer**: [Team Slack channel]
- **Backend Lead**: [Email/Phone]
- **DevOps**: [Email/Phone]
- **Security**: [Email/Phone]

---

## 🔗 Related Documentation

- [SECURITY.md](./docs/SECURITY.md) - Security policies and vulnerabilities
- [API.md](./docs/API.md) - API specification and usage
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System architecture
- [DEPLOY.md](./docs/DEPLOY.md) - Deployment guide

---

## 📝 Changelog

| Date | Change | Impact |
|------|--------|--------|
| 2025-10-24 | Add TempFileCleanup service | Prevents disk space exhaustion |
| 2025-10-24 | Add SECURITY.md documentation | Improved security awareness |
| 2025-10-24 | Explicit validator dependency | Better npm audit control |

---

**Version**: 1.0
**Last Updated**: 2025-10-24
**Next Review**: 2025-11-24
