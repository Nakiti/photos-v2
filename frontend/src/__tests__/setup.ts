/// <reference types="node" />
// Force WatermelonDB to use its in-memory SQLite adapter (via better-sqlite3)
process.env['NODE_ENV'] = 'test';
// @ts-ignore
global.__DEV__ = true;
