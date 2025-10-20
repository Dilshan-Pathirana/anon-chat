import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  MONGO_URI: z.string().url(),
  PORT: z.string().transform(Number).default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MAX_FILE_SIZE: z.string().transform(Number).default('5242880'), // 5MB
  INACTIVE_TIMEOUT: z.string().transform(Number).default('300000'), // 5 minutes
});

const envParse = envSchema.safeParse(process.env);

if (!envParse.success) {
  console.error('❌ Invalid environment variables:', envParse.error.format());
  process.exit(1);
}

export const config = envParse.data;