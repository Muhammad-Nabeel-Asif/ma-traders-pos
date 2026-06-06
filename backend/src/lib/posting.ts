import { eq, sql, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { accounts, ledgerEntries } from '../db/schema.js';

/**
 * Account balance in paisa = openingBalance + sum(debit) - sum(credit).
 * Positive means the customer owes us (receivable / debit balance).
 */
export function getAccountBalance(accountId: number): number {
  const accRow = db
    .select({ opening: accounts.openingBalance })
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .get();

  const opening = accRow?.opening ?? 0;

  const agg = db
    .select({
      debit: sql<number>`coalesce(sum(${ledgerEntries.debit}), 0)`,
      credit: sql<number>`coalesce(sum(${ledgerEntries.credit}), 0)`,
    })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.accountId, accountId))
    .get();

  return opening + (agg?.debit ?? 0) - (agg?.credit ?? 0);
}

/**
 * Total outstanding receivable handled by a salesman: the sum of current
 * balances across all customer accounts assigned to that salesman.
 */
export function getSalesmanOutstanding(salesmanId: number): number {
  const accountRows = db
    .select({ id: accounts.id, opening: accounts.openingBalance })
    .from(accounts)
    .where(eq(accounts.salesmanId, salesmanId))
    .all();

  if (accountRows.length === 0) return 0;
  const ids = accountRows.map((a) => a.id);
  const openingSum = accountRows.reduce((s, a) => s + a.opening, 0);

  const agg = db
    .select({
      debit: sql<number>`coalesce(sum(${ledgerEntries.debit}), 0)`,
      credit: sql<number>`coalesce(sum(${ledgerEntries.credit}), 0)`,
    })
    .from(ledgerEntries)
    .where(inArray(ledgerEntries.accountId, ids))
    .all()[0];

  return openingSum + (agg?.debit ?? 0) - (agg?.credit ?? 0);
}
