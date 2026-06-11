/** Format paise to INR string — never use rupee symbol */
export const formatINR = (paise: number): string => {
  const rupees = paise / 100;
  return `INR ${rupees.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
};

/** Debounce helper for search */
export const debounce = <T extends (...args: any[]) => void>(fn: T, delay: number) => {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

/** Stock status helper */
export const getStockStatus = (qty: number, threshold: number): 'in_stock' | 'low_stock' | 'out_of_stock' => {
  if (qty <= 0) return 'out_of_stock';
  if (qty <= threshold) return 'low_stock';
  return 'in_stock';
};

/** Cart totals calculation */
export const calcCartTotals = (items: {quantity: number; price_snapshot: number; gst_rate: number}[]) => {
  const subtotal = items.reduce((sum, i) => sum + i.price_snapshot * i.quantity, 0);
  const gst = items.reduce((sum, i) => sum + Math.round(i.price_snapshot * i.quantity * i.gst_rate / 100), 0);
  return {subtotal, gst, grandTotal: subtotal + gst};
};
