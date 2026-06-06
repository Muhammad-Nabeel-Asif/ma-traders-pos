import { Router } from 'express';
import { eq, desc, sql, and, gte, lte } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { accounts, cashVouchers, ledgerEntries } from '../db/schema.js';
import { asyncHandler, badRequest } from '../lib/http.js';
import { getAccountBalance } from '../lib/posting.js';

export const cashRouter = Router();

const voucherSchema = z.object({
  type: z.enum(['RECEIVE', 'PAYMENT']),
  date: z.string().min(1),
  accountId: z.number().int(),
  amount: z.number().int().positive('Amount must be greater than zero'),
  narration: z.string().optional().default(''),
});

function nextVoucherNo(): number {
  const row = db
    .select({ max: sql<number>`coalesce(max(${cashVouchers.voucherNo}), 0)` })
    .from(cashVouchers)
    .get();
  return (row?.max ?? 0) + 1;
}

cashRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const type = req.query.type as string | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const conditions = [];
    if (type) conditions.push(eq(cashVouchers.type, type as never));
    if (from) conditions.push(gte(cashVouchers.date, from));
    if (to) conditions.push(lte(cashVouchers.date, to));
    const rows = db
      .select({
        id: cashVouchers.id,
        voucherNo: cashVouchers.voucherNo,
        type: cashVouchers.type,
        date: cashVouchers.date,
        accountId: cashVouchers.accountId,
        accountName: accounts.name,
        amount: cashVouchers.amount,
        narration: cashVouchers.narration,
      })
      .from(cashVouchers)
      .leftJoin(accounts, eq(cashVouchers.accountId, accounts.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(cashVouchers.id))
      .all();
    res.json(rows);
  }),
);

cashRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = voucherSchema.safeParse(req.body);
    if (!parsed.success)
      throw badRequest(parsed.error.issues[0]?.message ?? 'Invalid data');
    const data = parsed.data;

    const account = db
      .select()
      .from(accounts)
      .where(eq(accounts.id, data.accountId))
      .get();
    if (!account) throw badRequest('Select a valid account');

    const voucher = db.transaction((tx) => {
      const voucherNo = nextVoucherNo();
      const row = tx
        .insert(cashVouchers)
        .values({
          voucherNo,
          type: data.type,
          date: data.date,
          accountId: data.accountId,
          amount: data.amount,
          narration: data.narration ?? '',
          createdByUserId: req.user?.id ?? null,
        })
        .returning()
        .get();

      // RECEIVE: customer pays us -> credit (reduces receivable)
      // PAYMENT: we pay out -> debit (increases receivable / reduces payable)
      tx.insert(ledgerEntries)
        .values({
          accountId: data.accountId,
          date: data.date,
          refType: data.type === 'RECEIVE' ? 'CASH_RECEIVE' : 'CASH_PAYMENT',
          refId: row.id,
          narration:
            data.narration ||
            (data.type === 'RECEIVE'
              ? `Cash received #${voucherNo}`
              : `Cash paid #${voucherNo}`),
          debit: data.type === 'PAYMENT' ? data.amount : 0,
          credit: data.type === 'RECEIVE' ? data.amount : 0,
          salesmanId: account.salesmanId ?? null,
        })
        .run();

      return row;
    });

    res.status(201).json({
      voucher,
      balance: getAccountBalance(data.accountId),
    });
  }),
);
