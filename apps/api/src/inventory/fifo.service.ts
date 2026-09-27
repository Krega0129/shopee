import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import Decimal from 'decimal.js';

type Tx = Omit<PrismaClient, '$connect'|'$disconnect'|'$on'|'$transaction'|'$use'|'$extends'>;

@Injectable()
export class FifoService {
  async rebuild(tx: Tx, productId: number) {
    const batches = await tx.inventoryBatch.findMany({
      where: { productId }, include: { purchase: true },
      orderBy: [{ purchase: { purchaseDate: 'asc' } }, { createdAt: 'asc' }, { id: 'asc' }],
    });
    const orders = await tx.saleOrder.findMany({ where: { productId }, orderBy: [{ saleDate: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }] });
    await tx.inventoryAllocation.deleteMany({ where: { saleOrder: { productId } } });
    await Promise.all(batches.map(b => tx.inventoryBatch.update({ where: { id: b.id }, data: { remainingQuantity: b.quantity } })));
    const left = new Map(batches.map(b => [b.id, b.quantity]));
    for (const order of orders) {
      let required = order.quantity;
      let goods = new Decimal(0), packaging = new Decimal(0);
      for (const batch of batches) {
        const available = left.get(batch.id) ?? 0;
        if (!available || required === 0) continue;
        const take = Math.min(available, required);
        const goodsPart = new Decimal(batch.productUnitCost.toString()).mul(take);
        const packagingPart = new Decimal(batch.packagingUnitCost.toString()).mul(take);
        await tx.inventoryAllocation.create({ data: {
          saleOrderId: order.id, batchId: batch.id, quantity: take,
          productUnitCostSnapshot: batch.productUnitCost,
          packagingUnitCostSnapshot: batch.packagingUnitCost,
          totalCost: goodsPart.plus(packagingPart).toFixed(4),
        }});
        left.set(batch.id, available - take);
        required -= take; goods = goods.plus(goodsPart); packaging = packaging.plus(packagingPart);
      }
      if (required > 0) throw new BadRequestException(`SKU 库存不足：订单 ${order.orderNo} 缺少 ${required} 件`);
      const comprehensive = goods.plus(packaging);
      const orderCost = comprehensive.plus(order.otherFees.toString());
      const profit = new Decimal(order.cnyAmount.toString()).minus(orderCost);
      const margin = new Decimal(order.cnyAmount.toString()).isZero() ? null : profit.div(order.cnyAmount.toString());
      await tx.saleOrder.update({ where: { id: order.id }, data: {
        goodsCost: goods.toFixed(4), packagingCost: packaging.toFixed(4), comprehensiveCost: comprehensive.toFixed(4),
        orderCost: orderCost.toFixed(4), grossProfit: profit.toFixed(4), grossMargin: margin?.toFixed(6) ?? null,
      }});
    }
    await Promise.all(batches.map(b => tx.inventoryBatch.update({ where: { id: b.id }, data: { remainingQuantity: left.get(b.id) ?? 0 } })));
  }
}
