export function formatRupees(paise: number, decimals?: number): string {
  const rupees = paise / 100;
  if (decimals !== undefined) {
    return `₹${rupees.toLocaleString("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  }
  return `₹${Math.floor(rupees).toLocaleString("en-IN")}`;
}

export function formatCurrency(
  amount: number,
  currency: string = "INR",
  divisor: number = 1,
  decimals?: number
): string {
  const value = amount / divisor;
  const symbol = currency === "INR" ? "₹" : `${currency} `;
  if (decimals !== undefined) {
    return `${symbol}${value.toLocaleString("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  }
  return `${symbol}${Math.floor(value).toLocaleString("en-IN")}`;
}

