import { sql } from 'drizzle-orm';
import { db } from './index.js';
import {
  users,
  towns,
  salesmen,
  accounts,
  products,
} from './schema.js';
import { hashPassword } from '../lib/auth.js';
import { runMigrations } from './migrate.js';

const rupees = (r: number) => Math.round(r * 100);

/** Ensures a default admin user exists. Safe to call on every boot. */
export async function ensureSeed(): Promise<void> {
  const count = db
    .select({ c: sql<number>`count(*)` })
    .from(users)
    .get();
  if ((count?.c ?? 0) === 0) {
    const passwordHash = await hashPassword('admin123');
    db.insert(users)
      .values({
        username: 'admin',
        passwordHash,
        fullName: 'Administrator',
        role: 'admin',
        permissions: '{}',
      })
      .run();
    // eslint-disable-next-line no-console
    console.log('[seed] Created default admin user (admin / admin123)');
  }
}

/** Full sample data set for development / demos. */
async function seedSampleData(): Promise<void> {
  runMigrations();
  await ensureSeed();

  const hasTowns = db.select({ c: sql<number>`count(*)` }).from(towns).get();
  if ((hasTowns?.c ?? 0) > 0) {
    // eslint-disable-next-line no-console
    console.log('[seed] Sample data already present, skipping.');
    return;
  }

  const kirpa = db
    .insert(towns)
    .values({ name: 'KIRPA RAAM', code: 'KR' })
    .returning()
    .get();
  const cityCenter = db
    .insert(towns)
    .values({ name: 'CITY CENTER', code: 'CC' })
    .returning()
    .get();

  const kk = db
    .insert(salesmen)
    .values({ name: 'KK IQBAL', phone: '0300-0000000', creditLimit: rupees(725000) })
    .returning()
    .get();
  const ali = db
    .insert(salesmen)
    .values({ name: 'ALI RAZA', phone: '0301-1111111', creditLimit: rupees(300000) })
    .returning()
    .get();

  db.insert(accounts)
    .values([
      {
        code: '121328',
        name: 'SHAH G K/S',
        type: 'customer',
        address: 'KIRPA RAAM',
        townId: kirpa.id,
        salesmanId: kk.id,
        shopLimit: rupees(150000),
        openingBalance: rupees(15000),
      },
      {
        code: '121329',
        name: 'AL MADINA STORE',
        type: 'customer',
        address: 'CITY CENTER',
        townId: cityCenter.id,
        salesmanId: ali.id,
        shopLimit: rupees(100000),
        openingBalance: rupees(5000),
      },
      {
        code: 'CASH',
        name: 'CASH IN HAND',
        type: 'cash',
        address: '',
      },
    ])
    .run();

  db.insert(products)
    .values([
      {
        code: 'P-1001',
        name: 'FRIPO SLANTY V-TABLE 10',
        cartonSize: 12,
        purchasePrice: rupees(400),
        salePrice: rupees(430),
        stockUnits: 180,
      },
      {
        code: 'P-1002',
        name: 'FRIPO SLANTY SAITED RS=10',
        cartonSize: 12,
        purchasePrice: rupees(400),
        salePrice: rupees(430),
        stockUnits: 180,
      },
      {
        code: 'P-1003',
        name: 'CURLS POP RS=10',
        cartonSize: 12,
        purchasePrice: rupees(410),
        salePrice: rupees(440),
        stockUnits: 240,
      },
    ])
    .run();

  // eslint-disable-next-line no-console
  console.log('[seed] Sample towns, salesmen, accounts and products created.');
}

if (process.argv[1] && /seed\.(ts|js)$/.test(process.argv[1])) {
  seedSampleData()
    .then(() => process.exit(0))
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      process.exit(1);
    });
}
