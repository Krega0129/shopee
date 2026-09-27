import { PrismaClient } from '@prisma/client';
const db=new PrismaClient();
async function main(){if(await db.site.count())return;await db.site.create({data:{name:'Shopee 马来西亚',shop:'Demo Shop',currency:'MYR',exchangeRate:'1.62',platformFeeRate:'0.075'}});await db.product.createMany({data:[{name:'防蓝光眼镜',sku:'GLASS-001',category:'眼镜',referenceProductCost:'10',referencePackagingCost:'1.5'},{name:'商务电脑包',sku:'BAG-001',category:'箱包',referenceProductCost:'35',referencePackagingCost:'2.5'}]});}
main().finally(()=>db.$disconnect());
