import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { money } from '../common/money';

@Controller('sites')
export class SitesController {
 constructor(private db:PrismaService){}
 @Get() list(){return this.db.site.findMany({include:{mappings:{include:{product:true}}},orderBy:{createdAt:'desc'}})}
 @Post() create(@Body() b:any){if(!b.name||!b.shop||!b.currency) throw new BadRequestException('名称、店铺和币种必填');return this.db.site.create({data:{name:b.name,shop:b.shop,currency:b.currency.toUpperCase(),exchangeRate:money(b.exchangeRate,'汇率').toFixed(6),platformFeeRate:money(b.platformFeeRate,'平台费率').toFixed(6),active:b.active!==false}})}
 @Patch(':id') update(@Param('id') id:string,@Body() b:any){return this.db.site.update({where:{id:+id},data:{name:b.name,shop:b.shop,currency:b.currency?.toUpperCase(),exchangeRate:money(b.exchangeRate,'汇率').toFixed(6),platformFeeRate:money(b.platformFeeRate,'平台费率').toFixed(6),active:b.active!==false}})}
 @Delete(':id') remove(@Param('id') id:string){return this.db.site.delete({where:{id:+id}})}
 @Post(':id/mappings') mapping(@Param('id') id:string,@Body() b:any){return this.db.siteProductMapping.create({data:{siteId:+id,productId:+b.productId,externalName:b.externalName,variationName:b.variationName||null}})}
 @Delete('mappings/:mappingId') removeMapping(@Param('mappingId') id:string){return this.db.siteProductMapping.delete({where:{id:+id}})}
}
