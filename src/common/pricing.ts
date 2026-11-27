export function roundMoney(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function calculateReservationPrice(start: Date, end: Date, pricePerHour: unknown) {
  const hours = (end.getTime() - start.getTime()) / 3_600_000;
  return roundMoney(hours * Number(pricePerHour));
}
