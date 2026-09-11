export function formatRupees(paise: number): string {
  return `₹${Math.floor(paise / 100)}`;
}

export function formatCurrency(amount: number, currency: string = "INR", divisor: number = 1): string {
  const value = Math.floor(amount / divisor);
  return `${currency === "INR" ? "₹" : currency + " "}${value}`;
}
