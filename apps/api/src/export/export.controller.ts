import { BadRequestException, Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma.service';

@Controller('export')
export class ExportController {
  constructor(private db: PrismaService) {}

  @Get()
  async export(@Query('start') start: string, @Query('end') end: string, @Res() res: Response) {
    if (!start || !end) throw new BadRequestException('请选择开始日期和结束日期');
    const startDate = new Date(`${start}T00:00:00.000Z`);
    const endDate = new Date(`${end}T23:59:59.999Z`);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) {
      throw new BadRequestException('日期范围无效');
    }
    const range = { gte: startDate, lte: endDate };
    const [products, sites, mappings, purchases, inventory, orders, ads, withdrawals] = await Promise.all([
      this.db.product.findMany({ orderBy: { sku: 'asc' } }),
      this.db.site.findMany({ orderBy: { name: 'asc' } }),
      this.db.siteProductMapping.findMany({ include: { site: true, product: true }, orderBy: { id: 'asc' } }),
      this.db.purchase.findMany({ where: { purchaseDate: range }, include: { batches: { include: { product: true } } }, orderBy: { purchaseDate: 'asc' } }),
      this.db.inventoryBatch.findMany({ include: { product: true, purchase: true }, orderBy: [{ product: { sku: 'asc' } }, { purchase: { purchaseDate: 'asc' } }] }),
      this.db.saleOrder.findMany({ where: { saleDate: range }, include: { site: true, product: true, allocations: { include: { batch: { include: { purchase: true } } } } }, orderBy: { saleDate: 'asc' } }),
      this.db.adExpense.findMany({ where: { expenseDate: range }, include: { site: true }, orderBy: { expenseDate: 'asc' } }),
      this.db.withdrawal.findMany({ where: { withdrawalDate: range }, include: { site: true }, orderBy: { withdrawalDate: 'asc' } }),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Shopee Ledger';
    workbook.created = new Date();
    workbook.properties.date1904 = false;
    const addSheet = (name: string, headers: { header: string; key: string; width?: number; numFmt?: string }[], rows: any[]) => {
      const sheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
      sheet.columns = headers.map(h => ({ header: h.header, key: h.key, width: h.width || Math.max(12, h.header.length * 2 + 2), style: h.numFmt ? { numFmt: h.numFmt } : undefined }));
      sheet.addRows(rows);
      sheet.autoFilter = { from: 'A1', to: sheet.getRow(1).getCell(headers.length).address };
      sheet.getRow(1).height = 26;
      sheet.getRow(1).eachCell(cell => { cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF257A60' } }; cell.alignment = { vertical: 'middle', horizontal: 'center' }; });
      sheet.eachRow((row, index) => { if (index > 1) { row.height = 22; row.alignment = { vertical: 'middle' }; if (index % 2 === 0) row.eachCell(cell => cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF6F9F8' } }); } });
      return sheet;
    };
    const n = (v: any) => Number(v || 0);
    const d = (v: Date) => v;
    const sum = (xs: any[], key: string) => xs.reduce((total, x) => total + n(x[key]), 0);
    const purchaseRows = purchases.flatMap(p => p.batches.map(b => ({ date:d(p.purchaseDate), orderNo:p.purchaseOrderNo, supplier:p.supplier, sku:b.product.sku, product:b.product.name, specification:b.specification||'', quantity:b.quantity, productUnitCost:n(b.productUnitCost), packagingUnitCost:n(b.packagingUnitCost), comprehensiveUnitCost:n(b.productUnitCost)+n(b.packagingUnitCost), productTotal:b.quantity*n(b.productUnitCost), batchTotal:b.quantity*(n(b.productUnitCost)+n(b.packagingUnitCost)), notes:p.notes||'' })));
    const allocationRows = orders.flatMap(o => o.allocations.map(a => ({ saleDate:d(o.saleDate), orderNo:o.orderNo, lineNo:o.lineNo, sku:o.product.sku, purchaseOrderNo:a.batch.purchase.purchaseOrderNo, purchaseDate:d(a.batch.purchase.purchaseDate), allocatedQuantity:a.quantity, productUnitCost:n(a.productUnitCostSnapshot), packagingUnitCost:n(a.packagingUnitCostSnapshot), totalCost:n(a.totalCost) })));
    const metrics = {
      purchaseInvestment: purchaseRows.reduce((s, x) => s + x.batchTotal, 0), salesRevenue: sum(orders, 'cnyAmount'), salesCost: sum(orders, 'orderCost'), salesProfit: sum(orders, 'grossProfit'), adSpend: sum(ads, 'amount'), withdrawals: sum(withdrawals, 'amount'), withdrawalFees: sum(withdrawals, 'fee'), inventoryQuantity: inventory.reduce((s, x) => s + x.remainingQuantity, 0), inventoryValue: inventory.reduce((s, x) => s + x.remainingQuantity * (n(x.productUnitCost) + n(x.packagingUnitCost)), 0),
    };
    const summary = addSheet('汇总', [{header:'项目',key:'label',width:28},{header:'数值',key:'value',width:20},{header:'说明',key:'notes',width:52}], [
      {label:'统计开始日期',value:startDate,notes:'含当日'},{label:'统计结束日期',value:endDate,notes:'含当日'},{label:'导出时间',value:new Date(),notes:'本地系统时间'},
      {label:'采购投入（期间）',value:metrics.purchaseInvestment,notes:'期间采购批次综合成本'},{label:'销售到账（期间）',value:metrics.salesRevenue,notes:'订单 CNY 到账金额'},{label:'订单成本（期间）',value:metrics.salesCost,notes:'FIFO 综合成本 + 订单其他费用'},{label:'销售毛利（期间）',value:metrics.salesProfit,notes:'销售到账 - 订单成本'},{label:'广告投入（期间）',value:metrics.adSpend,notes:'广告费用流水'},{label:'提现金额（期间）',value:metrics.withdrawals,notes:'资金划转，不计入利润'},{label:'提现手续费（期间）',value:metrics.withdrawalFees,notes:'计入期间损益'},{label:'净盈亏（期间）',value:metrics.salesProfit-metrics.adSpend-metrics.withdrawalFees,notes:'销售毛利 - 广告投入 - 提现手续费'},{label:'当前库存数量',value:metrics.inventoryQuantity,notes:'导出时点全部库存，不受日期范围限制'},{label:'当前库存价值',value:metrics.inventoryValue,notes:'导出时点全部 FIFO 批次剩余价值'},
    ]);
    summary.getColumn(2).numFmt = '#,##0.00'; summary.getCell('B2').numFmt='yyyy-mm-dd'; summary.getCell('B3').numFmt='yyyy-mm-dd'; summary.getCell('B4').numFmt='yyyy-mm-dd hh:mm'; summary.properties.tabColor={argb:'FF185C47'};
    addSheet('商品', [{header:'SKU',key:'sku',width:18},{header:'产品名称',key:'name',width:32},{header:'品类',key:'category',width:16},{header:'参考产品成本/件',key:'referenceProductCost',width:18,numFmt:'#,##0.0000'},{header:'参考包材成本/件',key:'referencePackagingCost',width:18,numFmt:'#,##0.0000'},{header:'参考综合成本/件',key:'referenceTotal',width:18,numFmt:'#,##0.0000'},{header:'备注',key:'notes',width:30}], products.map(p=>({sku:p.sku,name:p.name,category:p.category||'',referenceProductCost:n(p.referenceProductCost),referencePackagingCost:n(p.referencePackagingCost),referenceTotal:n(p.referenceProductCost)+n(p.referencePackagingCost),notes:p.notes||''})));
    addSheet('站点', [{header:'站点名称',key:'name',width:24},{header:'店铺',key:'shop',width:24},{header:'币种',key:'currency',width:10},{header:'汇率',key:'exchangeRate',width:14,numFmt:'#,##0.000000'},{header:'平台费率',key:'platformFeeRate',width:14,numFmt:'0.00%'},{header:'状态',key:'status',width:10}], sites.map(s=>({name:s.name,shop:s.shop,currency:s.currency,exchangeRate:n(s.exchangeRate),platformFeeRate:n(s.platformFeeRate),status:s.active?'启用':'停用'})));
    addSheet('站点商品映射', [{header:'站点',key:'site',width:24},{header:'内部 SKU',key:'sku',width:18},{header:'内部产品名称',key:'product',width:30},{header:'站点商品名称',key:'externalName',width:48},{header:'Variation',key:'variationName',width:28}], mappings.map(m=>({site:m.site.name,sku:m.product.sku,product:m.product.name,externalName:m.externalName,variationName:m.variationName||''})));
    addSheet('采购批次', [{header:'采购日期',key:'date',width:14,numFmt:'yyyy-mm-dd'},{header:'采购订单号',key:'orderNo',width:20},{header:'厂家',key:'supplier',width:22},{header:'SKU',key:'sku',width:18},{header:'产品名称',key:'product',width:30},{header:'规格',key:'specification',width:22},{header:'数量',key:'quantity',width:10,numFmt:'#,##0'},{header:'产品单价',key:'productUnitCost',width:14,numFmt:'#,##0.0000'},{header:'包材/件',key:'packagingUnitCost',width:14,numFmt:'#,##0.0000'},{header:'综合/件',key:'comprehensiveUnitCost',width:14,numFmt:'#,##0.0000'},{header:'产品总价',key:'productTotal',width:16,numFmt:'#,##0.00'},{header:'批次总成本',key:'batchTotal',width:16,numFmt:'#,##0.00'},{header:'备注',key:'notes',width:30}], purchaseRows);
    addSheet('库存快照', [{header:'SKU',key:'sku',width:18},{header:'产品名称',key:'product',width:30},{header:'采购日期',key:'date',width:14,numFmt:'yyyy-mm-dd'},{header:'采购订单号',key:'orderNo',width:20},{header:'入库数量',key:'quantity',width:12,numFmt:'#,##0'},{header:'已售数量',key:'sold',width:12,numFmt:'#,##0'},{header:'剩余数量',key:'remaining',width:12,numFmt:'#,##0'},{header:'产品单价',key:'productUnitCost',width:14,numFmt:'#,##0.0000'},{header:'包材单价',key:'packagingUnitCost',width:14,numFmt:'#,##0.0000'},{header:'剩余价值',key:'remainingValue',width:16,numFmt:'#,##0.00'}], inventory.map(b=>({sku:b.product.sku,product:b.product.name,date:d(b.purchase.purchaseDate),orderNo:b.purchase.purchaseOrderNo,quantity:b.quantity,sold:b.quantity-b.remainingQuantity,remaining:b.remainingQuantity,productUnitCost:n(b.productUnitCost),packagingUnitCost:n(b.packagingUnitCost),remainingValue:b.remainingQuantity*(n(b.productUnitCost)+n(b.packagingUnitCost))})));
    addSheet('销售订单', [{header:'日期',key:'date',width:14,numFmt:'yyyy-mm-dd'},{header:'订单号',key:'orderNo',width:22},{header:'行号',key:'lineNo',width:8},{header:'站点',key:'site',width:22},{header:'SKU',key:'sku',width:18},{header:'产品名称',key:'product',width:30},{header:'数量',key:'quantity',width:10,numFmt:'#,##0'},{header:'币种',key:'currency',width:10},{header:'汇率快照',key:'exchangeRate',width:14,numFmt:'#,##0.000000'},{header:'原币到账',key:'originalAmount',width:16,numFmt:'#,##0.00'},{header:'CNY 到账',key:'cnyAmount',width:16,numFmt:'#,##0.00'},{header:'产品成本',key:'goodsCost',width:16,numFmt:'#,##0.00'},{header:'包材成本',key:'packagingCost',width:16,numFmt:'#,##0.00'},{header:'综合成本',key:'comprehensiveCost',width:16,numFmt:'#,##0.00'},{header:'其他费用',key:'otherFees',width:14,numFmt:'#,##0.00'},{header:'订单成本',key:'orderCost',width:16,numFmt:'#,##0.00'},{header:'毛利',key:'grossProfit',width:16,numFmt:'#,##0.00'},{header:'毛利率',key:'grossMargin',width:12,numFmt:'0.00%'},{header:'备注',key:'notes',width:30}], orders.map(o=>({date:d(o.saleDate),orderNo:o.orderNo,lineNo:o.lineNo,site:o.site.name,sku:o.product.sku,product:o.product.name,quantity:o.quantity,currency:o.currencySnapshot,exchangeRate:n(o.exchangeRateSnapshot),originalAmount:n(o.originalAmount),cnyAmount:n(o.cnyAmount),goodsCost:n(o.goodsCost),packagingCost:n(o.packagingCost),comprehensiveCost:n(o.comprehensiveCost),otherFees:n(o.otherFees),orderCost:n(o.orderCost),grossProfit:n(o.grossProfit),grossMargin:o.grossMargin==null?null:n(o.grossMargin),notes:o.notes||''})));
    addSheet('FIFO分摊', [{header:'销售日期',key:'saleDate',width:14,numFmt:'yyyy-mm-dd'},{header:'销售订单号',key:'orderNo',width:22},{header:'行号',key:'lineNo',width:8},{header:'SKU',key:'sku',width:18},{header:'采购订单号',key:'purchaseOrderNo',width:20},{header:'采购日期',key:'purchaseDate',width:14,numFmt:'yyyy-mm-dd'},{header:'分配数量',key:'allocatedQuantity',width:12,numFmt:'#,##0'},{header:'产品单价快照',key:'productUnitCost',width:18,numFmt:'#,##0.0000'},{header:'包材单价快照',key:'packagingUnitCost',width:18,numFmt:'#,##0.0000'},{header:'成本小计',key:'totalCost',width:16,numFmt:'#,##0.00'}], allocationRows);
    addSheet('广告费用', [{header:'日期',key:'date',width:14,numFmt:'yyyy-mm-dd'},{header:'站点',key:'site',width:24},{header:'渠道',key:'channel',width:22},{header:'金额（CNY）',key:'amount',width:16,numFmt:'#,##0.00'},{header:'备注',key:'notes',width:32}], ads.map(a=>({date:d(a.expenseDate),site:a.site.name,channel:a.channel||'',amount:n(a.amount),notes:a.notes||''})));
    addSheet('提现记录', [{header:'日期',key:'date',width:14,numFmt:'yyyy-mm-dd'},{header:'站点',key:'site',width:24},{header:'提现金额（CNY）',key:'amount',width:18,numFmt:'#,##0.00'},{header:'手续费（CNY）',key:'fee',width:16,numFmt:'#,##0.00'},{header:'备注',key:'notes',width:32}], withdrawals.map(w=>({date:d(w.withdrawalDate),site:w.site.name,amount:n(w.amount),fee:n(w.fee),notes:w.notes||''})));

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `shopee-ledger-${start}_${end}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(Buffer.from(buffer));
  }
}
