export function formatCurrencyFromCents(
  cents: number,
  currency: string = 'USD'
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatCurrency(
  amountInMinorUnits: number,
  currency: string = 'INR',
  divisor: number = 100
): string {
  const majorUnits = amountInMinorUnits / divisor;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(majorUnits);
}
export function formatPricePerPerson(
  amount: number,
  currency: string = 'USD'
): string {
  return `${formatCurrency(amount, currency)}/person`;
}
