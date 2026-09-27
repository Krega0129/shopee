import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { money } from '../common/money';

@Controller()
export class ExpensesController {
 constructor(private db:PrismaService){}
 @Get('ads') ads(){return this.db.adExpense.findMany({include:{site:true},orderBy:{expenseDate:'desc'}})}
 @Post('ads') addAd(@Body() b:any){return this.db.adExpense.create({data:{expenseDate:new Date(b.date),siteId:+b.siteId,amount:money(b.amount).toFixed(4),channel:b.channel||null,notes:b.notes||null}})}
 @Patch('ads/:id') editAd(@Param('id') id:string,@Body() b:any){return this.db.adExpense.update({where:{id:+id},data:{expenseDate:new Date(b.date),siteId:+b.siteId,amount:money(b.amount).toFixed(4),channel:b.channel||null,notes:b.notes||null}})}
 @Delete('ads/:id') delAd(@Param('id') id:string){return this.db.adExpense.delete({where:{id:+id}})}
 @Get('withdrawals') withdrawals(){return this.db.withdrawal.findMany({include:{site:true},orderBy:{withdrawalDate:'desc'}})}
 @Post('withdrawals') addWithdrawal(@Body() b:any){return this.db.withdrawal.create({data:{withdrawalDate:new Date(b.date),siteId:+b.siteId,amount:money(b.amount).toFixed(4),fee:money(b.fee).toFixed(4),notes:b.notes||null}})}
 @Patch('withdrawals/:id') editWithdrawal(@Param('id') id:string,@Body() b:any){return this.db.withdrawal.update({where:{id:+id},data:{withdrawalDate:new Date(b.date),siteId:+b.siteId,amount:money(b.amount).toFixed(4),fee:money(b.fee).toFixed(4),notes:b.notes||null}})}
 @Delete('withdrawals/:id') delWithdrawal(@Param('id') id:string){return this.db.withdrawal.delete({where:{id:+id}})}
}
