import {sqliteTable,text} from 'drizzle-orm/sqlite-core';
// Connection settings only. All influencer business records and uploads live in Google Drive.
export const connection=sqliteTable('drive_connection',{id:text('id').primaryKey(),endpoint:text('endpoint').notNull(),secret:text('secret').notNull(),updatedAt:text('updated_at').notNull()});
