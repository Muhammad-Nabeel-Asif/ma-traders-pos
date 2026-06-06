import { Router } from 'express';
import { eq, and, gte, lte, asc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  accounts,
  ledgerEntries,
  salesmen,
  saleInvoices,
  cashVouchers,
  towns,
} from '../db/schema.js';
import { asyncHandler, notFound } from '../lib/http.js';
import { getAccountBalance } from '../lib/posting.js';

export const reportsRouter = Router();

// Account ledger with running balance
reportsRouter.get(
  '/ledger/:accountId',
  asyncHandler(async (req, res) => {
    const accountId = Number(req.params.accountId);
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const account = db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .get();
    if (!account) throw notFound('Account not found');

    const conditions = [eq(ledgerEntries.accountId, accountId)];
    if (from) conditions.push(gte(ledgerEntries.date, from));
    if (to) conditions.push(lte(ledgerEntries.date, to));

    // opening balance = account opening + everything before `from`
    let openingBalance = account.openingBalance;
    if (from) {
      const before = db
        .select({
          debit: sql<number>`coalesce(sum(${ledgerEntries.debit}), 0)`,
          credit: sql<number>`coalesce(sum(${ledgerEntries.credit}), 0)`,
        })
        .from(ledgerEntries)
        .where(
          and(
            eq(ledgerEntries.accountId, accountId),
            sql`${ledgerEntries.date} < ${from}`,
          ),
        )
        .get();
      openingBalance += (before?.debit ?? 0) - (before?.credit ?? 0);
    }

    const rows = db
      .select()
      .from(ledgerEntries)
      .where(and(...conditions))
      .orderBy(asc(ledgerEntries.date), asc(ledgerEntries.id))
      .all();

    let running = openingBalance;
    const entries = rows.map((r) => {
      running += r.debit - r.credit;
      return { ...r, balance: running };
    });

    res.json({
      account,
      openingBalance,
      entries,
      closingBalance: running,
    });
  }),
);

// Salesman ledger: their customers + balances
reportsRouter.get(
  '/salesman-ledger/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const salesman = db
      .select()
      .from(salesmen)
      .where(eq(salesmen.id, id))
      .get();
    if (!salesman) throw notFound('Salesman not found');

    const custRows = db
      .select()
      .from(accounts)
      .where(eq(accounts.salesmanId, id))
      .all();

    const customers = custRows.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      balance: getAccountBalance(c.id),
    }));
    const outstanding = customers.reduce((s, c) => s + c.balance, 0);

    res.json({
      salesman,
      customers,
      outstanding,
      creditLimit: salesman.creditLimit,
      available: salesman.creditLimit - outstanding,
    });
  }),
);

// All balance: every account with current balance
reportsRouter.get(
  '/all-balance',
  asyncHandler(async (req, res) => {
    const type = req.query.type as string | undefined;
    const rows = db
      .select()
      .from(accounts)
      .where(type ? eq(accounts.type, type as never) : undefined)
      .all();

    const townRows = db.select().from(towns).all();
    const townMap = new Map(townRows.map((t) => [t.id, t.name]));

    const data = rows.map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      type: a.type,
      town: a.townId ? townMap.get(a.townId) ?? '' : '',
      balance: getAccountBalance(a.id),
    }));

    const totalDebit = data
      .filter((d) => d.balance > 0)
      .reduce((s, d) => s + d.balance, 0);
    const totalCredit = data
      .filter((d) => d.balance < 0)
      .reduce((s, d) => s + Math.abs(d.balance), 0);

    res.json({ accounts: data, totalDebit, totalCredit });
  }),
);

// Daily report: sales + cash for a date (or range)
reportsRouter.get(
  '/daily',
  asyncHandler(async (req, res) => {
    const date = (req.query.date as string) ?? new Date().toISOString().slice(0, 10);
    const from = (req.query.from as string) ?? date;
    const to = (req.query.to as string) ?? date;

    const sales = db
      .select({
        id: saleInvoices.id,
        invoiceNo: saleInvoices.invoiceNo,
        date: saleInvoices.date,
        accountName: accounts.name,
        paymentMode: saleInvoices.paymentMode,
        invoiceTotal: saleInvoices.invoiceTotal,
      })
      .from(saleInvoices)
      .leftJoin(accounts, eq(saleInvoices.accountId, accounts.id))
      .where(and(gte(saleInvoices.date, from), lte(saleInvoices.date, to)))
      .orderBy(asc(saleInvoices.invoiceNo))
      .all();

    const vouchers = db
      .select({
        id: cashVouchers.id,
        voucherNo: cashVouchers.voucherNo,
        type: cashVouchers.type,
        date: cashVouchers.date,
        accountName: accounts.name,
        amount: cashVouchers.amount,
      })
      .from(cashVouchers)
      .leftJoin(accounts, eq(cashVouchers.accountId, accounts.id))
      .where(and(gte(cashVouchers.date, from), lte(cashVouchers.date, to)))
      .orderBy(asc(cashVouchers.id))
      .all();

    const totalSales = sales.reduce((s, r) => s + r.invoiceTotal, 0);
    const cashSales = sales
      .filter((s) => s.paymentMode === 'CASH')
      .reduce((s, r) => s + r.invoiceTotal, 0);
    const creditSales = totalSales - cashSales;
    const received = vouchers
      .filter((v) => v.type === 'RECEIVE')
      .reduce((s, r) => s + r.amount, 0);
    const paid = vouchers
      .filter((v) => v.type === 'PAYMENT')
      .reduce((s, r) => s + r.amount, 0);

    res.json({
      from,
      to,
      sales,
      vouchers,
      summary: {
        totalSales,
        cashSales,
        creditSales,
        received,
        paid,
        invoiceCount: sales.length,
      },
    });
  }),
);
