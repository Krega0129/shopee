import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Controller('inventory')
export class InventoryController {
 constructor(private db:PrismaService){}
 @Get() async list(){
  const products=await this.db.product.findMany({include:{batches:{include:{purchase:true},orderBy:[{purchase:{purchaseDate:'asc'}},{createdAt:'asc'}]}}});
  return products.map(p=>({...p,totalQuantity:p.batches.reduce((s,b)=>s+b.remainingQuantity,0),inventoryValue:p.batches.reduce((s,b)=>s+b.remainingQuantity*(Number(b.productUnitCost)+Number(b.packagingUnitCost)),0)}));
 }
}
