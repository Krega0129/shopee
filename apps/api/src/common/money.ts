import Decimal from 'decimal.js';
import { BadRequestException } from '@nestjs/common';

export const money = (value: Decimal.Value | undefined | null, field = '金额') => {
  try {
    const result = new Decimal(value ?? 0);
    if (!result.isFinite() || result.isNegative()) throw new Error();
    return result.toDecimalPlaces(4);
  } catch { throw new BadRequestException(`${field}必须是非负数字`); }
};
export const positiveInt = (value: unknown, field = '数量') => {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new BadRequestException(`${field}必须是正整数`);
  return n;
};
