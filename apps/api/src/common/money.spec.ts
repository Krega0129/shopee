import { describe,expect,it } from 'vitest';
import Decimal from 'decimal.js';
describe('money calculations',()=>{it('keeps decimal precision',()=>expect(new Decimal('0.1').plus('0.2').toFixed(2)).toBe('0.30'));it('calculates cross-batch cost',()=>{const result=new Decimal(2).mul('11.5').plus(new Decimal(2).mul('14.5'));expect(result.toFixed(2)).toBe('52.00')})});
