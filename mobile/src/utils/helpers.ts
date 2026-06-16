// /** Server host — matches api.ts BASE_URL */
// const SERVER_HOST = 'raja1-glbd.onrender.com';
const SERVER_HOST = '192.168.1.38:8000';


/**
 * Rewrites image URLs stored with `localhost` or `127.0.0.1`
 * (uploaded before BACKEND_URL env was set) so they resolve
 * correctly on a physical device or external network.
 */
export const normalizeImageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  let normalized = url
    .replace(/localhost:\d+/, SERVER_HOST)
    .replace(/127\.0\.0\.1:\d+/, SERVER_HOST);

  // Only convert http to https if it's not a local IP address or localhost
  if (!normalized.includes('192.168.') && !normalized.includes('10.') && !normalized.includes('172.') && !normalized.includes('localhost') && !normalized.includes('127.0.0.1')) {
    normalized = normalized.replace(/^http:/, 'https:');
  }
  return normalized;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const formatDateSecure = (dateStr: any): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    if (typeof dateStr === 'string') {
      const cleaned = dateStr.trim().replace(' ', 'T').replace(/\+00:00$/, 'Z');
      const fallbackDate = new Date(cleaned);
      if (!isNaN(fallbackDate.getTime())) {
        const day = fallbackDate.getDate();
        const month = MONTHS[fallbackDate.getMonth()];
        const year = fallbackDate.getFullYear();
        return `${day} ${month} ${year}`;
      }
      const match = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const y = parseInt(match[1]);
        const m = MONTHS[parseInt(match[2]) - 1];
        const d = parseInt(match[3]);
        return `${d} ${m} ${y}`;
      }
    }
    return '';
  }
  const day = date.getDate();
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

/** Format paise to INR string — never use rupee symbol */
export const formatINR = (paise: number): string => {
  const rupees = paise / 100;
  return `INR ${rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
export const calcCartTotals = (items: { quantity: number; price_snapshot: number; gst_rate: number }[]) => {
  const subtotal = items.reduce((sum, i) => sum + i.price_snapshot * i.quantity, 0);
  const gst = items.reduce((sum, i) => sum + Math.round(i.price_snapshot * i.quantity * i.gst_rate / 100), 0);
  return { subtotal, gst, grandTotal: subtotal + gst };
};
