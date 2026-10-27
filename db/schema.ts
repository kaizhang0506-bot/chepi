// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const users=sqliteTable('studio_users',{id:text('id').primaryKey(),username:text('username').notNull().unique(),password:text('password').notNull(),role:text('role').notNull().default('user'),mustChange:integer('must_change').notNull().default(0),disabled:integer('disabled').notNull().default(0),created:integer('created').notNull()});
export const sessions=sqliteTable('studio_sessions',{token:text('token').primaryKey(),userId:text('user_id').notNull().references(()=>users.id),expires:integer('expires').notNull()});
export const attempts=sqliteTable('studio_attempts',{key:text('key').primaryKey(),count:integer('count').notNull(),expires:integer('expires').notNull()});
export const designs=sqliteTable('studio_designs',{id:text('id').primaryKey(),userId:text('user_id').notNull().references(()=>users.id),name:text('name').notNull(),objectKey:text('object_key').notNull(),created:integer('created').notNull()});

export const cases=sqliteTable('studio_cases',{id:text('id').primaryKey(),userId:text('user_id').notNull().references(()=>users.id),title:text('title').notNull(),style:text('style').notNull(),tags:text('tags').notNull().default('[]'),status:text('status').notNull().default('pending'),objectKey:text('object_key').notNull(),created:integer('created').notNull()});
export const settings=sqliteTable('studio_settings',{key:text('key').primaryKey(),value:text('value').notNull()});
