CREATE TABLE `search_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`query` text NOT NULL,
	`searchType` text DEFAULT 'posts' NOT NULL,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updatedAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `search_history_query_type_idx` ON `search_history` (`query`,`searchType`);--> statement-breakpoint
CREATE INDEX `search_history_updatedAt_idx` ON `search_history` (`updatedAt`);