/** How a number reads in a card: the `format` the catalog gives Chart, Table and Statistic. */
export type A2uiNumberFormat = 'compact' | 'currency' | 'number' | 'percent';

export const NUMBER_FORMATS: readonly A2uiNumberFormat[] = [
  'number',
  'compact',
  'currency',
  'percent',
];

/**
 * A number in the reader's language. Percent values are 0-100 (12.4 reads 12.4%), as the catalog
 * tells Agents; currency defaults to USD.
 */
export const formatNumber = (
  value: number,
  format: A2uiNumberFormat | undefined,
  locale?: string,
  currency = 'USD',
): string => {
  if (!Number.isFinite(value)) return '';
  try {
    switch (format) {
      case 'compact': {
        return new Intl.NumberFormat(locale, {
          maximumFractionDigits: 1,
          notation: 'compact',
        }).format(value);
      }
      case 'currency': {
        return new Intl.NumberFormat(locale, {
          currency,
          maximumFractionDigits: Math.abs(value) >= 1000 || Number.isInteger(value) ? 0 : 2,
          notation: Math.abs(value) >= 1_000_000 ? 'compact' : 'standard',
          style: 'currency',
        }).format(value);
      }
      case 'percent': {
        return new Intl.NumberFormat(locale, { maximumFractionDigits: 1, style: 'percent' }).format(
          value / 100,
        );
      }
      default: {
        return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
      }
    }
  } catch {
    // An unknown currency code: the plain number still reads.
    return value.toLocaleString(locale);
  }
};

export const isNumberFormat = (value: unknown): value is A2uiNumberFormat =>
  typeof value === 'string' && (NUMBER_FORMATS as readonly string[]).includes(value);
