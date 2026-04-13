export function getFinancialYearCode(date: Date): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;

  return `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`;
}

export function formatSerialNumber(date: Date, sequence: number): string {
  return `${getFinancialYearCode(date)}${String(sequence).padStart(5, '0')}`;
}

export function nextSerialNumber(options: { date?: Date; lastSequence?: number }) {
  const date = options.date ?? new Date();
  const nextSequence = (options.lastSequence ?? 0) + 1;

  return {
    serialNumber: formatSerialNumber(date, nextSequence),
    sequence: nextSequence,
    financialYearCode: getFinancialYearCode(date),
  };
}
