export interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  role: string;
  permissions: Record<string, unknown>;
}

export interface Town {
  id: number;
  name: string;
  code: string;
}

export interface Salesman {
  id: number;
  name: string;
  phone: string;
  creditLimit: number;
  active: boolean;
  outstanding?: number;
}

export type AccountType =
  | 'customer'
  | 'supplier'
  | 'cash'
  | 'expense'
  | 'income'
  | 'other';

export interface Account {
  id: number;
  code: string;
  name: string;
  type: AccountType;
  address: string;
  phone: string;
  townId: number | null;
  salesmanId: number | null;
  shopLimit: number;
  openingBalance: number;
  active: boolean;
  balance?: number;
}

export interface Product {
  id: number;
  code: string;
  name: string;
  cartonSize: number;
  purchasePrice: number;
  salePrice: number;
  stockUnits: number;
  active: boolean;
}

export interface SaleItemInput {
  productId: number;
  sch: number;
  schemeFree: number;
  ctn: number;
  box: number;
  safi: number;
  freeQty: number;
  rate: number;
  discPct: number;
  discRs: number;
}

export interface SaleListRow {
  id: number;
  invoiceNo: number;
  date: string;
  accountId: number;
  accountName: string | null;
  paymentMode: 'CASH' | 'CREDIT';
  invoiceTotal: number;
  netTotal: number;
}

export interface LedgerEntry {
  id: number;
  accountId: number;
  date: string;
  refType: string;
  refId: number | null;
  narration: string;
  debit: number;
  credit: number;
  balance: number;
}
