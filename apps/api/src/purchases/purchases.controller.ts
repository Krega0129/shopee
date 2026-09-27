import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { FifoService } from '../inventory/fifo.service';
import { money, positiveInt } from '../common/money';

@Controller('purchases')
export class PurchasesController {
 constructor(private db:PrismaService,private fifo:FifoService){}
 @Get() list(){return this.db.purchase.findMany({include:{batches:{include:{product:true}}},orderBy:{purchaseDate:'desc'}})}
 @Post() create(@Body() b:any){return this.db.$transaction(async tx=>{const qty=positiveInt(b.quantity);const purchase=await tx.purchase.create({data:{purchaseDate:new Date(b.purchaseDate),purchaseOrderNo:b.purchaseOrderNo,supplier:b.supplier,notes:b.notes||null,batches:{create:{productId:+b.productId,specification:b.specification||null,quantity:qty,remainingQuantity:qty,productUnitCost:money(b.productUnitCost).toFixed(4),packagingUnitCost:money(b.packagingUnitCost).toFixed(4)}}},include:{batches:true}});await this.fifo.rebuild(tx,purchase.batches[0].productId);return purchase;})}
 @Patch(':id') update(@Param('id') id:string,@Body() b:any){return this.db.$transaction(async tx=>{const old=await tx.purchase.findUnique({where:{id:+id},include:{batches:true}});if(!old)throw new BadRequestException('采购记录不存在');const batch=old.batches[0];await tx.purchase.update({where:{id:+id},data:{purchaseDate:new Date(b.purchaseDate),purchaseOrderNo:b.purchaseOrderNo,supplier:b.supplier,notes:b.notes||null}});await tx.inventoryBatch.update({where:{id:batch.id},data:{productId:+b.productId,specification:b.specification||null,quantity:positiveInt(b.quantity),productUnitCost:money(b.productUnitCost).toFixed(4),packagingUnitCost:money(b.packagingUnitCost).toFixed(4)}});for(const pid of new Set([batch.productId,+b.productId]))await this.fifo.rebuild(tx,pid);return tx.purchase.findUnique({where:{id:+id},include:{batches:true}})})}
 @Delete(':id') remove(@Param('id') id:string){return this.db.$transaction(async tx=>{const p=await tx.purchase.findUnique({where:{id:+id},include:{batches:true}});if(!p)throw new BadRequestException('采购记录不存在');const ids=[...new Set(p.batches.map(x=>x.productId))];await tx.purchase.delete({where:{id:+id}});for(const pid of ids)await this.fifo.rebuild(tx,pid);return {success:true}})}
}
