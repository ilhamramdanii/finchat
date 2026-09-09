import * as Joi from 'joi';

export function validate(config: Record<string, unknown>) {
  const schema = Joi.object({
    DATABASE_URL: Joi.string().required(),
    JWT_SECRET: Joi.string().min(32).required(),
    JWT_EXPIRES_IN: Joi.string().default('7d'),
    REDIS_HOST: Joi.string().default('localhost'),
    REDIS_PORT: Joi.number().default(6379),
    PORT: Joi.number().default(3000),
    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
    FRONTEND_URL: Joi.string().default('http://localhost:4200'),
    WA_SESSION_PATH: Joi.string().default('./wa-sessions'),
    WA_OWNER_PHONE: Joi.string().allow('').default(''),
  }).unknown(true);

  const { error } = schema.validate(config);
  if (error) {
    throw new Error(`Config validation error: ${error.message}`);
  }

  return config;
}
