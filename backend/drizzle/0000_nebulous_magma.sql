CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'customer' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`town_id` integer,
	`salesman_id` integer,
	`shop_limit` integer DEFAULT 0 NOT NULL,
	`opening_balance` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`town_id`) REFERENCES `towns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`salesman_id`) REFERENCES `salesmen`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_code_unique` ON `accounts` (`code`);--> statement-breakpoint
CREATE INDEX `accounts_name_idx` ON `accounts` (`name`);--> statement-breakpoint
CREATE INDEX `accounts_town_idx` ON `accounts` (`town_id`);--> statement-breakpoint
CREATE INDEX `accounts_salesman_idx` ON `accounts` (`salesman_id`);--> statement-breakpoint
CREATE TABLE `cash_vouchers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`voucher_no` integer NOT NULL,
	`type` text NOT NULL,
	`date` text NOT NULL,
	`account_id` integer NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`narration` text DEFAULT '' NOT NULL,
	`created_by_user_id` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `cash_vouchers_account_idx` ON `cash_vouchers` (`account_id`);--> statement-breakpoint
CREATE INDEX `cash_vouchers_date_idx` ON `cash_vouchers` (`date`);--> statement-breakpoint
CREATE TABLE `ledger_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`date` text NOT NULL,
	`ref_type` text NOT NULL,
	`ref_id` integer,
	`narration` text DEFAULT '' NOT NULL,
	`debit` integer DEFAULT 0 NOT NULL,
	`credit` integer DEFAULT 0 NOT NULL,
	`salesman_id` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`salesman_id`) REFERENCES `salesmen`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ledger_account_idx` ON `ledger_entries` (`account_id`);--> statement-breakpoint
CREATE INDEX `ledger_date_idx` ON `ledger_entries` (`date`);--> statement-breakpoint
CREATE INDEX `ledger_salesman_idx` ON `ledger_entries` (`salesman_id`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`carton_size` integer DEFAULT 1 NOT NULL,
	`purchase_price` integer DEFAULT 0 NOT NULL,
	`sale_price` integer DEFAULT 0 NOT NULL,
	`stock_units` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_code_unique` ON `products` (`code`);--> statement-breakpoint
CREATE INDEX `products_name_idx` ON `products` (`name`);--> statement-breakpoint
CREATE TABLE `sale_invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_no` integer NOT NULL,
	`date` text NOT NULL,
	`account_id` integer NOT NULL,
	`salesman_id` integer,
	`payment_mode` text DEFAULT 'CREDIT' NOT NULL,
	`pre_balance` integer DEFAULT 0 NOT NULL,
	`gross_total` integer DEFAULT 0 NOT NULL,
	`discount_pct` real DEFAULT 0 NOT NULL,
	`discount_rs` integer DEFAULT 0 NOT NULL,
	`invoice_total` integer DEFAULT 0 NOT NULL,
	`net_total` integer DEFAULT 0 NOT NULL,
	`descript` text DEFAULT 'SALE' NOT NULL,
	`claimable` integer DEFAULT false NOT NULL,
	`created_by_user_id` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`salesman_id`) REFERENCES `salesmen`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sale_invoices_invoice_no_unique` ON `sale_invoices` (`invoice_no`);--> statement-breakpoint
CREATE INDEX `sale_invoices_account_idx` ON `sale_invoices` (`account_id`);--> statement-breakpoint
CREATE INDEX `sale_invoices_date_idx` ON `sale_invoices` (`date`);--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`sch` integer DEFAULT 0 NOT NULL,
	`scheme_free` integer DEFAULT 0 NOT NULL,
	`ctn` integer DEFAULT 0 NOT NULL,
	`box` integer DEFAULT 0 NOT NULL,
	`safi` integer DEFAULT 0 NOT NULL,
	`free_qty` integer DEFAULT 0 NOT NULL,
	`rate` integer DEFAULT 0 NOT NULL,
	`disc_pct` real DEFAULT 0 NOT NULL,
	`disc_rs` integer DEFAULT 0 NOT NULL,
	`line_total` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `sale_invoices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sale_items_invoice_idx` ON `sale_items` (`invoice_id`);--> statement-breakpoint
CREATE TABLE `salesmen` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`credit_limit` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stock_moves` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`date` text NOT NULL,
	`ref_type` text NOT NULL,
	`ref_id` integer,
	`qty_units` integer DEFAULT 0 NOT NULL,
	`rate` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `stock_moves_product_idx` ON `stock_moves` (`product_id`);--> statement-breakpoint
CREATE TABLE `towns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`code` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`full_name` text DEFAULT '' NOT NULL,
	`role` text DEFAULT 'operator' NOT NULL,
	`permissions` text DEFAULT '{}' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);