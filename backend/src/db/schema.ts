import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from 'drizzle-orm/sqlite-core';

/**
 * Money is stored as INTEGER paisa (1 rupee = 100 paisa) to avoid floating point
 * errors in accounting. Quantities are stored as integers in base units.
 * Business dates are stored as ISO 'YYYY-MM-DD' text; createdAt is a unix-ms integer.
 */

const createdAt = integer('created_at', { mode: 'number' })
  .notNull()
  .default(sql`(unixepoch() * 1000)`);

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull().default(''),
  role: text('role', { enum: ['admin', 'manager', 'operator'] })
    .notNull()
    .default('operator'),
  // JSON string of permission flags for the User Rights screen (phase 3)
  permissions: text('permissions').notNull().default('{}'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt,
});

export const towns = sqliteTable('towns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  code: text('code').notNull().default(''),
  createdAt,
});

export const salesmen = sqliteTable('salesmen', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  phone: text('phone').notNull().default(''),
  // SM Limit (credit limit) in paisa
  creditLimit: integer('credit_limit').notNull().default(0),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt,
});

export const accounts = sqliteTable(
  'accounts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    // business code shown in the UI (e.g. 121328)
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    type: text('type', {
      enum: ['customer', 'supplier', 'cash', 'expense', 'income', 'other'],
    })
      .notNull()
      .default('customer'),
    address: text('address').notNull().default(''),
    phone: text('phone').notNull().default(''),
    townId: integer('town_id').references(() => towns.id),
    salesmanId: integer('salesman_id').references(() => salesmen.id),
    // Shop credit limit in paisa
    shopLimit: integer('shop_limit').notNull().default(0),
    // Opening balance in paisa (positive = receivable / debit)
    openingBalance: integer('opening_balance').notNull().default(0),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    createdAt,
  },
  (t) => ({
    nameIdx: index('accounts_name_idx').on(t.name),
    townIdx: index('accounts_town_idx').on(t.townId),
    salesmanIdx: index('accounts_salesman_idx').on(t.salesmanId),
  }),
);

export const products = sqliteTable(
  'products',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    // base units (pieces/packs) contained in one carton (Ctn)
    cartonSize: integer('carton_size').notNull().default(1),
    // prices in paisa, expressed per carton
    purchasePrice: integer('purchase_price').notNull().default(0),
    salePrice: integer('sale_price').notNull().default(0),
    // current stock in base units
    stockUnits: integer('stock_units').notNull().default(0),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    createdAt,
  },
  (t) => ({
    nameIdx: index('products_name_idx').on(t.name),
  }),
);

export const saleInvoices = sqliteTable(
  'sale_invoices',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    invoiceNo: integer('invoice_no').notNull().unique(),
    date: text('date').notNull(),
    accountId: integer('account_id')
      .notNull()
      .references(() => accounts.id),
    salesmanId: integer('salesman_id').references(() => salesmen.id),
    paymentMode: text('payment_mode', { enum: ['CASH', 'CREDIT'] })
      .notNull()
      .default('CREDIT'),
    // account balance before this invoice (paisa)
    preBalance: integer('pre_balance').notNull().default(0),
    // sum of line totals before invoice-level discount (paisa)
    grossTotal: integer('gross_total').notNull().default(0),
    discountPct: real('discount_pct').notNull().default(0),
    discountRs: integer('discount_rs').notNull().default(0),
    // grossTotal - discount (paisa)
    invoiceTotal: integer('invoice_total').notNull().default(0),
    // invoiceTotal + preBalance (paisa)
    netTotal: integer('net_total').notNull().default(0),
    descript: text('descript').notNull().default('SALE'),
    claimable: integer('claimable', { mode: 'boolean' })
      .notNull()
      .default(false),
    createdByUserId: integer('created_by_user_id').references(() => users.id),
    createdAt,
  },
  (t) => ({
    accountIdx: index('sale_invoices_account_idx').on(t.accountId),
    dateIdx: index('sale_invoices_date_idx').on(t.date),
  }),
);

export const saleItems = sqliteTable(
  'sale_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    invoiceId: integer('invoice_id')
      .notNull()
      .references(() => saleInvoices.id, { onDelete: 'cascade' }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id),
    sch: integer('sch').notNull().default(0),
    schemeFree: integer('scheme_free').notNull().default(0),
    ctn: integer('ctn').notNull().default(0),
    box: integer('box').notNull().default(0),
    safi: integer('safi').notNull().default(0),
    freeQty: integer('free_qty').notNull().default(0),
    // rate per carton in paisa
    rate: integer('rate').notNull().default(0),
    discPct: real('disc_pct').notNull().default(0),
    discRs: integer('disc_rs').notNull().default(0),
    lineTotal: integer('line_total').notNull().default(0),
  },
  (t) => ({
    invoiceIdx: index('sale_items_invoice_idx').on(t.invoiceId),
  }),
);

export const cashVouchers = sqliteTable(
  'cash_vouchers',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    voucherNo: integer('voucher_no').notNull(),
    type: text('type', { enum: ['RECEIVE', 'PAYMENT'] }).notNull(),
    date: text('date').notNull(),
    accountId: integer('account_id')
      .notNull()
      .references(() => accounts.id),
    amount: integer('amount').notNull().default(0),
    narration: text('narration').notNull().default(''),
    createdByUserId: integer('created_by_user_id').references(() => users.id),
    createdAt,
  },
  (t) => ({
    accountIdx: index('cash_vouchers_account_idx').on(t.accountId),
    dateIdx: index('cash_vouchers_date_idx').on(t.date),
  }),
);

/**
 * The single source of truth for account balances and ledgers.
 * Every financial document posts one or more rows here.
 * debit increases a receivable (customer owes us), credit decreases it.
 */
export const ledgerEntries = sqliteTable(
  'ledger_entries',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    accountId: integer('account_id')
      .notNull()
      .references(() => accounts.id),
    date: text('date').notNull(),
    refType: text('ref_type', {
      enum: [
        'OPENING',
        'SALE',
        'SALE_RETURN',
        'CASH_RECEIVE',
        'CASH_PAYMENT',
        'JOURNAL',
        'CLAIM',
      ],
    }).notNull(),
    refId: integer('ref_id'),
    narration: text('narration').notNull().default(''),
    debit: integer('debit').notNull().default(0),
    credit: integer('credit').notNull().default(0),
    salesmanId: integer('salesman_id').references(() => salesmen.id),
    createdAt,
  },
  (t) => ({
    accountIdx: index('ledger_account_idx').on(t.accountId),
    dateIdx: index('ledger_date_idx').on(t.date),
    salesmanIdx: index('ledger_salesman_idx').on(t.salesmanId),
  }),
);

export const stockMoves = sqliteTable(
  'stock_moves',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id),
    date: text('date').notNull(),
    refType: text('ref_type', {
      enum: ['OPENING', 'PURCHASE', 'PURCHASE_RETURN', 'SALE', 'SALE_RETURN', 'CLAIM', 'ADJUST'],
    }).notNull(),
    refId: integer('ref_id'),
    // signed quantity in base units (negative = out)
    qtyUnits: integer('qty_units').notNull().default(0),
    rate: integer('rate').notNull().default(0),
    createdAt,
  },
  (t) => ({
    productIdx: index('stock_moves_product_idx').on(t.productId),
  }),
);

export type User = typeof users.$inferSelect;
export type Town = typeof towns.$inferSelect;
export type Salesman = typeof salesmen.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Product = typeof products.$inferSelect;
export type SaleInvoice = typeof saleInvoices.$inferSelect;
export type SaleItem = typeof saleItems.$inferSelect;
export type CashVoucher = typeof cashVouchers.$inferSelect;
export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type StockMove = typeof stockMoves.$inferSelect;
