import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config();

export default defineConfig({
    schema: path.join('prisma', 'schema.prisma'),
    datasource: {
        url: process.env.DATABASE_URL!,
    },
});

