const { z } = require('zod');

const EnvSchema = z.object({
  PORT: z.string().regex(/^\d+$/, 'PORT must be a number').transform(Number).default('8000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
  FRONTEND_URLS: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
});

function validateEnv(env = process.env) {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
    console.warn(`⚠️ Invalid environment configuration: ${issues}`);
  }
  return parsed.success ? parsed.data : env;
}

module.exports = { validateEnv };


