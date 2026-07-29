import * as dotenv from "dotenv";

dotenv.config({ path: `${__dirname}/../.env` });

export default {
  PORT: process.env.PORT || 3000,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  TOTAL_CVS: Number(process.env.TOTAL_CVS),
  TOP_K: Number(process.env.TOP_K),
};
