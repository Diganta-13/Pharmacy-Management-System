export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function cn(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}
