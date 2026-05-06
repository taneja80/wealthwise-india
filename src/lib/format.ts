/**
 * Format numbers in Indian locale with comma separators
 * Examples: 100000 -> 1,00,000; 10000000 -> 1,00,00,000
 */
export function formatNumber(value: number | string | undefined | null): string {
  if (value === undefined || value === null || value === "") return "0";
  const num = typeof value === "string" ? Number(value) : value;
  if (isNaN(num)) return "0";
  return num.toLocaleString("en-IN");
}

/**
 * Format currency in Indian locale with ₹ symbol
 * Examples: 100000 -> ₹1,00,000
 */
export function formatCurrency(value: number | string | undefined | null): string {
  return `₹${formatNumber(value)}`;
}

/**
 * Format large numbers into compact Indian format (Lakhs/Crores)
 * Examples: 100000 -> ₹1.0L; 10000000 -> ₹1.0Cr; 1000000000 -> ₹100.0Cr
 */
export function formatCompact(value: number | string | undefined | null): string {
  if (value === undefined || value === null || value === "") return "₹0";
  const num = typeof value === "string" ? Number(value) : value;
  if (isNaN(num)) return "₹0";
  if (num === 0) return "₹0";

  const abs = Math.abs(num);
  if (abs >= 10000000) {
    return `₹${(num / 10000000).toFixed(1)}Cr`;
  }
  if (abs >= 100000) {
    return `₹${(num / 100000).toFixed(1)}L`;
  }
  if (abs >= 1000) {
    return `₹${(num / 1000).toFixed(1)}K`;
  }
  return `₹${num.toLocaleString("en-IN")}`;
}

/**
 * Format compact with full number on hover context
 * Returns both display and full formatted string
 */
export function formatCompactWithFull(value: number | string | undefined | null): { display: string; full: string } {
  return {
    display: formatCompact(value),
    full: formatCurrency(value),
  };
}

/**
 * Format percentage values
 */
export function formatPercent(value: number | string | undefined | null): string {
  if (value === undefined || value === null || value === "") return "0%";
  const num = typeof value === "string" ? Number(value) : value;
  if (isNaN(num)) return "0%";
  return `${num.toFixed(1)}%`;
}

/**
 * Parse a formatted number string back to number
 * Removes commas and ₹ symbol
 */
export function parseFormattedNumber(value: string): number {
  return Number(value.replace(/[₹,]/g, ""));
}
