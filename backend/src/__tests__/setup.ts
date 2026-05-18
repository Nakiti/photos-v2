// Global test setup — env vars and console suppression only.
// vi.mock() calls belong in individual test files where they are hoisted correctly.

process.env['NODE_ENV'] = 'test';
process.env['JWT_SECRET'] = 'test-jwt-secret-for-tests-only';
process.env['DATABASE_URL'] = 'mysql://test:test@localhost:3306/test';
process.env['REDIS_URL'] = 'redis://localhost:6379';
process.env['AWS_ACCESS_KEY_ID'] = 'test-key';
process.env['AWS_SECRET_ACCESS_KEY'] = 'test-secret';
process.env['AWS_REGION'] = 'us-east-1';
process.env['AWS_S3_BUCKET'] = 'test-bucket';
process.env['CLOUDFRONT_BASE_URL'] = 'https://cdn.test.com';
