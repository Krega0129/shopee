import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Controller('dashboard')
export class DashboardController {
 constructor(private db:PrismaService){}
 @Get() async data(@Query() q:any){
  const date=(field:string)=>q.start||q.end?{[field]:{...(q.start&&{gte:new Date(q.start)}),...(q.end&&{lte:new Date(`${q.end}T23:59:59`)})}}:{};
  const site=q.siteId?{siteId:+q.siteId}:{};
  const [orders,ads,withdrawals,batches]=await Promise.all([
   this.db.saleOrder.findMany({where:{...site,...date('saleDate')},include:{site:true,product:true}}),
   this.db.adExpense.findMany({where:{...site,...date('expenseDate')}}),
   this.db.withdrawal.findMany({where:{...site,...date('withdrawalDate')}}),
   this.db.inventoryBatch.findMany({include:{purchase:true,product:true}}),
  ]);
  const sum=(xs:any[],key:string)=>xs.reduce((s,x)=>s+Number(x[key]||0),0);
  const purchaseInvestment=batches.filter(b=>(!q.start||b.purchase.purchaseDate>=new Date(q.start))&&(!q.end||b.purchase.purchaseDate<=new Date(`${q.end}T23:59:59`))).reduce((s,b)=>s+b.quantity*(Number(b.productUnitCost)+Number(b.packagingUnitCost)),0);
  const adSpend=sum(ads,'amount'),otherFees=sum(orders,'otherFees'),withdrawalFees=sum(withdrawals,'fee');
  const byDay=new Map<string,{date:string,revenue:number,profit:number,ads:number}>();
  const point=(d:Date)=>{const k=d.toISOString().slice(0,10);if(!byDay.has(k))byDay.set(k,{date:k,revenue:0,profit:0,ads:0});return byDay.get(k)!};
  orders.forEach(o=>{const p=point(o.saleDate);p.revenue+=Number(o.cnyAmount);p.profit+=Number(o.grossProfit)});ads.forEach(a=>point(a.expenseDate).ads+=Number(a.amount));
  return {metrics:{purchaseInvestment,totalInvestment:purchaseInvestment+adSpend+otherFees+withdrawalFees,adSpend,otherFees,inventoryQuantity:batches.reduce((s,b)=>s+b.remainingQuantity,0),inventoryValue:batches.reduce((s,b)=>s+b.remainingQuantity*(Number(b.productUnitCost)+Number(b.packagingUnitCost)),0),salesRevenue:sum(orders,'cnyAmount'),salesProfit:sum(orders,'grossProfit'),withdrawals:sum(withdrawals,'amount'),withdrawalFees,netProfit:sum(orders,'grossProfit')-adSpend-withdrawalFees},trend:[...byDay.values()].sort((a,b)=>a.date.localeCompare(b.date)),topProducts:Object.values(orders.reduce((m:any,o:any)=>{const k=o.product.sku;m[k]??={name:o.product.name,sku:k,quantity:0,profit:0};m[k].quantity+=o.quantity;m[k].profit+=Number(o.grossProfit);return m},{})),siteProfit:Object.values(orders.reduce((m:any,o:any)=>{const k=o.site.name;m[k]??={name:k,revenue:0,profit:0};m[k].revenue+=Number(o.cnyAmount);m[k].profit+=Number(o.grossProfit);return m},{}))};
 }
}
