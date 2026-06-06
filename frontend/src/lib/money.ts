// Money is handled as integer paisa across the API. These helpers convert
// to/from rupees for display and input.

export const toPaisa = (rupees: number): number => Math.round(rupees * 100);
export const toRupees = (paisa: number): number => paisa / 100;

const pkrFormatter = new Intl.NumberFormat('en-PK', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format paisa as a PKR amount string, e.g. 130000 -> "1,300.00". */
export function formatPaisa(paisa: number): string {
  return pkrFormatter.format(toRupees(paisa ?? 0));
}

/** Format paisa with the Rs prefix, e.g. "Rs 1,300.00". */
export function formatPKR(paisa: number): string {
  return `Rs ${formatPaisa(paisa)}`;
}

/** Mirror of the backend per-line total computation. All money in paisa. */
export function computeLineTotalPaisa(args: {
  ctn: number;
  box: number;
  ratePaisa: number;
  cartonSize: number;
  discPct: number;
  discRsPaisa: number;
}): number {
  const { ctn, box, ratePaisa, cartonSize, discPct, discRsPaisa } = args;
  const perUnit = cartonSize > 0 ? ratePaisa / cartonSize : ratePaisa;
  const gross = ctn * ratePaisa + box * perUnit;
  const afterPct = gross * (1 - (discPct || 0) / 100);
  return Math.max(0, Math.round(afterPct) - (discRsPaisa || 0));
}
