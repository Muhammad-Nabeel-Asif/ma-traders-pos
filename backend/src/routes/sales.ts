import { Router } from 'express';
import { eq, desc, sql, and, gte, lte } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import {
  accounts,
  products,
  saleInvoices,
  saleItems,
  salesmen,
  ledgerEntries,
  stockMoves,
} from '../db/schema.js';
import { asyncHandler, badRequest, notFound } from '../lib/http.js';
import { getAccountBalance, getSalesmanOutstanding } from '../lib/posting.js';

export const salesRouter = Router();

const itemSchema = z.object({
  productId: z.number().int(),
  sch: z.number().int().nonnegative().default(0),
  schemeFree: z.number().int().nonnegative().default(0),
  ctn: z.number().int().nonnegative().default(0),
  box: z.number().int().nonnegative().default(0),
  safi: z.number().int().nonnegative().default(0),
  freeQty: z.number().int().nonnegative().default(0),
  rate: z.number().int().nonnegative().default(0),
  discPct: z.number().nonnegative().default(0),
  discRs: z.number().int().nonnegative().default(0),
});

const saleSchema = z.object({
  date: z.string().min(1),
  accountId: z.number().int(),
  salesmanId: z.number().int().nullable().optional(),
  paymentMode: z.enum(['CASH', 'CREDIT']).default('CREDIT'),
  discountPct: z.number().nonnegative().default(0),
  discountRs: z.number().int().nonnegative().default(0),
  descript: z.string().optional().default('SALE'),
  claimable: z.boolean().optional().default(false),
  items: z.array(itemSchema).min(1, 'Add at least one product'),
});

/** Compute one line total in paisa given carton rate and quantities. */
function computeLineTotal(it: z.infer<typeof itemSchema>, cartonSize: number) {
  const perUnit = cartonSize > 0 ? it.rate / cartonSize : it.rate;
  const gross = it.ctn * it.rate + it.box * perUnit;
  const afterPct = gross * (1 - it.discPct / 100);
  const total = Math.round(afterPct) - it.discRs;
  return Math.max(0, total);
}

function unitsOut(it: z.infer<typeof itemSchema>, cartonSize: number) {
  return (
    it.ctn * cartonSize + it.box + it.safi + it.freeQty + it.schemeFree
  );
}

function nextInvoiceNo(): number {
  const row = db
    .select({ max: sql<number>`coalesce(max(${saleInvoices.invoiceNo}), 0)` })
    .from(saleInvoices)
    .get();
  return (row?.max ?? 0) + 1;
}

// Preview totals + credit-limit warnings without saving
salesRouter.post(
  '/preview',
  asyncHandler(async (req, res) => {
    const parsed = saleSchema.safeParse(req.body);
    if (!parsed.success)
      throw badRequest(parsed.error.issues[0]?.message ?? 'Invalid data');
    res.json(buildTotals(parsed.data));
  }),
);

function buildTotals(data: z.infer<typeof saleSchema>) {
  const productIds = data.items.map((i) => i.productId);
  const prodRows = db.select().from(products).all();
  const prodMap = new Map(prodRows.map((p) => [p.id, p]));

  let grossTotal = 0;
  const lines = data.items.map((it) => {
    const p = prodMap.get(it.productId);
    const cartonSize = p?.cartonSize ?? 1;
    const lineTotal = computeLineTotal(it, cartonSize);
    grossTotal += lineTotal;
    return { ...it, lineTotal, cartonSize };
  });

  const invoiceTotal = Math.max(
    0,
    grossTotal - data.discountRs - Math.round((grossTotal * data.discountPct) / 100),
  );
  const preBalance = getAccountBalance(data.accountId);
  const netTotal = invoiceTotal + preBalance;

  const warnings: string[] = [];
  const account = db
    .select()
    .from(accounts)
    .where(eq(accounts.id, data.accountId))
    .get();

  if (account?.shopLimit && data.paymentMode === 'CREDIT') {
    if (preBalance + invoiceTotal > account.shopLimit) {
      warnings.push('Please Check Shop Credit Limit');
    }
  }

  const salesmanId = data.salesmanId ?? account?.salesmanId ?? null;
  if (salesmanId && data.paymentMode === 'CREDIT') {
    const sm = db
      .select()
      .from(salesmen)
      .where(eq(salesmen.id, salesmanId))
      .get();
    if (sm?.creditLimit) {
      const projected = getSalesmanOutstanding(salesmanId) + invoiceTotal;
      if (projected > sm.creditLimit) {
        warnings.push('Please Check Your Saleman Credit Limit');
      }
    }
  }

  return { lines, grossTotal, invoiceTotal, preBalance, netTotal, warnings, productIds };
}

salesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = saleSchema.safeParse(req.body);
    if (!parsed.success)
      throw badRequest(parsed.error.issues[0]?.message ?? 'Invalid data');
    const data = parsed.data;

    const account = db
      .select()
      .from(accounts)
      .where(eq(accounts.id, data.accountId))
      .get();
    if (!account) throw badRequest('Select a valid account');

    const totals = buildTotals(data);
    const salesmanId = data.salesmanId ?? account.salesmanId ?? null;

    const result = db.transaction((tx) => {
      const invoiceNo = nextInvoiceNo();
      const invoice = tx
        .insert(saleInvoices)
        .values({
          invoiceNo,
          date: data.date,
          accountId: data.accountId,
          salesmanId,
          paymentMode: data.paymentMode,
          preBalance: totals.preBalance,
          grossTotal: totals.grossTotal,
          discountPct: data.discountPct,
          discountRs: data.discountRs,
          invoiceTotal: totals.invoiceTotal,
          netTotal: totals.netTotal,
          descript: data.descript ?? 'SALE',
          claimable: data.claimable ?? false,
          createdByUserId: req.user?.id ?? null,
        })
        .returning()
        .get();

      for (const line of totals.lines) {
        tx.insert(saleItems)
          .values({
            invoiceId: invoice.id,
            productId: line.productId,
            sch: line.sch,
            schemeFree: line.schemeFree,
            ctn: line.ctn,
            box: line.box,
            safi: line.safi,
            freeQty: line.freeQty,
            rate: line.rate,
            discPct: line.discPct,
            discRs: line.discRs,
            lineTotal: line.lineTotal,
          })
          .run();

        const out = unitsOut(line, line.cartonSize);
        if (out !== 0) {
          tx.insert(stockMoves)
            .values({
              productId: line.productId,
              date: data.date,
              refType: 'SALE',
              refId: invoice.id,
              qtyUnits: -out,
              rate: line.rate,
            })
            .run();
          tx.update(products)
            .set({ stockUnits: sql`${products.stockUnits} - ${out}` })
            .where(eq(products.id, line.productId))
            .run();
        }
      }

      // Always record the sale as a debit on the customer account
      tx.insert(ledgerEntries)
        .values({
          accountId: data.accountId,
          date: data.date,
          refType: 'SALE',
          refId: invoice.id,
          narration: `Sale Inv #${invoiceNo}`,
          debit: totals.invoiceTotal,
          credit: 0,
          salesmanId,
        })
        .run();

      // For cash sales, record the immediate payment so the balance nets out
      if (data.paymentMode === 'CASH') {
        tx.insert(ledgerEntries)
          .values({
            accountId: data.accountId,
            date: data.date,
            refType: 'CASH_RECEIVE',
            refId: invoice.id,
            narration: `Cash sale Inv #${invoiceNo}`,
            debit: 0,
            credit: totals.invoiceTotal,
            salesmanId,
          })
          .run();
      }

      return invoice;
    });

    res.status(201).json({ invoice: result, warnings: totals.warnings });
  }),
);

salesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const conditions = [];
    if (from) conditions.push(gte(saleInvoices.date, from));
    if (to) conditions.push(lte(saleInvoices.date, to));
    const rows = db
      .select({
        id: saleInvoices.id,
        invoiceNo: saleInvoices.invoiceNo,
        date: saleInvoices.date,
        accountId: saleInvoices.accountId,
        accountName: accounts.name,
        paymentMode: saleInvoices.paymentMode,
        invoiceTotal: saleInvoices.invoiceTotal,
        netTotal: saleInvoices.netTotal,
      })
      .from(saleInvoices)
      .leftJoin(accounts, eq(saleInvoices.accountId, accounts.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(saleInvoices.invoiceNo))
      .all();
    res.json(rows);
  }),
);

salesRouter.get(
  '/next-no',
  asyncHandler(async (_req, res) => {
    res.json({ invoiceNo: nextInvoiceNo() });
  }),
);

salesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const invoice = db
      .select()
      .from(saleInvoices)
      .where(eq(saleInvoices.id, id))
      .get();
    if (!invoice) throw notFound('Invoice not found');
    const items = db
      .select({
        id: saleItems.id,
        productId: saleItems.productId,
        productName: products.name,
        sch: saleItems.sch,
        schemeFree: saleItems.schemeFree,
        ctn: saleItems.ctn,
        box: saleItems.box,
        safi: saleItems.safi,
        freeQty: saleItems.freeQty,
        rate: saleItems.rate,
        discPct: saleItems.discPct,
        discRs: saleItems.discRs,
        lineTotal: saleItems.lineTotal,
      })
      .from(saleItems)
      .leftJoin(products, eq(saleItems.productId, products.id))
      .where(eq(saleItems.invoiceId, id))
      .all();
    const account = db
      .select()
      .from(accounts)
      .where(eq(accounts.id, invoice.accountId))
      .get();
    res.json({ invoice, items, account });
  }),
);
