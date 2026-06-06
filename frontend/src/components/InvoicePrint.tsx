import { formatPaisa } from '../lib/money';

export interface PrintInvoice {
  invoiceNo: number;
  date: string;
  paymentMode: string;
  preBalance: number;
  grossTotal: number;
  discountRs: number;
  discountPct: number;
  invoiceTotal: number;
  netTotal: number;
}

export interface PrintItem {
  productName: string | null;
  ctn: number;
  box: number;
  freeQty: number;
  rate: number;
  discRs: number;
  lineTotal: number;
}

export interface PrintAccount {
  name: string;
  code: string;
  address: string;
}

interface Props {
  invoice: PrintInvoice;
  items: PrintItem[];
  account: PrintAccount | null;
  salesmanName?: string | null;
}

/** A clean printable invoice layout (A4-ish). */
export default function InvoicePrint({ invoice, items, account, salesmanName }: Props) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', color: '#000', padding: 12 }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>MA TRADERS</div>
        <div style={{ fontSize: 12 }}>Distribution &amp; Wholesale</div>
      </div>
      <table style={{ width: '100%', fontSize: 12, marginBottom: 8 }}>
        <tbody>
          <tr>
            <td>
              <b>Invoice #:</b> {invoice.invoiceNo}
            </td>
            <td>
              <b>Date:</b> {invoice.date}
            </td>
            <td>
              <b>Mode:</b> {invoice.paymentMode}
            </td>
          </tr>
          <tr>
            <td>
              <b>Customer:</b> {account?.name ?? ''} ({account?.code ?? ''})
            </td>
            <td>
              <b>Address:</b> {account?.address ?? ''}
            </td>
            <td>
              <b>Salesman:</b> {salesmanName ?? ''}
            </td>
          </tr>
        </tbody>
      </table>
      <table
        border={1}
        cellPadding={4}
        style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}
      >
        <thead>
          <tr style={{ background: '#eee' }}>
            <th style={{ textAlign: 'left' }}>#</th>
            <th style={{ textAlign: 'left' }}>Product</th>
            <th>Ctn</th>
            <th>Box</th>
            <th>Free</th>
            <th style={{ textAlign: 'right' }}>Rate</th>
            <th style={{ textAlign: 'right' }}>Disc</th>
            <th style={{ textAlign: 'right' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{it.productName}</td>
              <td style={{ textAlign: 'center' }}>{it.ctn}</td>
              <td style={{ textAlign: 'center' }}>{it.box}</td>
              <td style={{ textAlign: 'center' }}>{it.freeQty}</td>
              <td style={{ textAlign: 'right' }}>{formatPaisa(it.rate)}</td>
              <td style={{ textAlign: 'right' }}>{formatPaisa(it.discRs)}</td>
              <td style={{ textAlign: 'right' }}>{formatPaisa(it.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table style={{ width: '100%', fontSize: 12, marginTop: 8 }}>
        <tbody>
          <tr>
            <td style={{ width: '60%' }} />
            <td>
              <b>Gross Total:</b>
            </td>
            <td style={{ textAlign: 'right' }}>{formatPaisa(invoice.grossTotal)}</td>
          </tr>
          <tr>
            <td />
            <td>
              <b>Discount:</b>
            </td>
            <td style={{ textAlign: 'right' }}>{formatPaisa(invoice.discountRs)}</td>
          </tr>
          <tr>
            <td />
            <td>
              <b>Invoice Total:</b>
            </td>
            <td style={{ textAlign: 'right' }}>{formatPaisa(invoice.invoiceTotal)}</td>
          </tr>
          <tr>
            <td />
            <td>
              <b>Previous Balance:</b>
            </td>
            <td style={{ textAlign: 'right' }}>{formatPaisa(invoice.preBalance)}</td>
          </tr>
          <tr style={{ fontSize: 14 }}>
            <td />
            <td>
              <b>Net Balance:</b>
            </td>
            <td style={{ textAlign: 'right' }}>
              <b>{formatPaisa(invoice.netTotal)}</b>
            </td>
          </tr>
        </tbody>
      </table>
      <div style={{ marginTop: 30, fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
        <div>Received by: ____________________</div>
        <div>For MA Traders: ____________________</div>
      </div>
    </div>
  );
}
