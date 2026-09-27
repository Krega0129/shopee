import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { money } from '../common/money';

@Controller('products')
export class ProductsController {
  constructor(private db: PrismaService) {}
  @Get() async list() { return this.db.product.findMany({ orderBy: { createdAt: 'desc' } }); }
  @Post() async create(@Body() b: any) {
    if (!b.name?.trim() || !b.sku?.trim()) throw new BadRequestException('产品名称和 SKU 必填');
    return this.db.product.create({ data: { name:b.name.trim(), sku:b.sku.trim(), category:b.category||null, referenceProductCost:money(b.referenceProductCost).toFixed(4), referencePackagingCost:money(b.referencePackagingCost).toFixed(4), notes:b.notes||null } });
  }
  @Patch(':id') async update(@Param('id') id:string,@Body() b:any) { return this.db.product.update({ where:{id:+id}, data:{ name:b.name, sku:b.sku, category:b.category||null, referenceProductCost:money(b.referenceProductCost).toFixed(4), referencePackagingCost:money(b.referencePackagingCost).toFixed(4), notes:b.notes||null } }); }
  @Delete(':id') async remove(@Param('id') id:string) { return this.db.product.delete({where:{id:+id}}); }
}
