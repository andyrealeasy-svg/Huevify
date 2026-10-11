export const formatCompactNumber = (plays: number, isEn = false): string => {
  if (plays >= 10_000_000) {
    const val = plays / 1_000_000;
    // 1 decimal place when >= 10 million (e.g. 12,3 млн)
    const formatted = new Intl.NumberFormat(isEn ? 'en-US' : 'ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }).format(val);
    return isEn ? `${formatted}M` : `${formatted} млн`;
  }

  if (plays >= 1_000_000) {
    const val = plays / 1_000_000;
    // 2 decimal places when < 10 million (e.g. 1,23 млн)
    const formatted = new Intl.NumberFormat(isEn ? 'en-US' : 'ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(val);
    return isEn ? `${formatted}M` : `${formatted} млн`;
  }

  if (plays >= 100_000) {
    const val = Math.round(plays / 1_000);
    // whole thousands when >= 100k (e.g. 410 тыс.)
    const formatted = new Intl.NumberFormat(isEn ? 'en-US' : 'ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
    return isEn ? `${formatted}K` : `${formatted} тыс.`;
  }

  if (plays >= 1_000) {
    const val = plays / 1_000;
    const formatted = new Intl.NumberFormat(isEn ? 'en-US' : 'ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }).format(val);
    return isEn ? `${formatted}K` : `${formatted} тыс.`;
  }

  return new Intl.NumberFormat(isEn ? 'en-US' : 'ru-RU').format(plays);
};
