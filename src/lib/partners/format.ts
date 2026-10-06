// "From $X" prices of an alliance's services, for the portal and the CRM.
export function formatPriceFrom(price: string | null, locale: string) {
  if (!price) return null;
  const n = Number(price);
  return new Intl.NumberFormat(locale === "es" ? "es-US" : "en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
  }).format(n);
}
