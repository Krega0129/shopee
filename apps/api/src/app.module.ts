import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { FifoService } from './inventory/fifo.service';
import { ProductsController } from './products/products.controller';
import { SitesController } from './sites/sites.controller';
import { PurchasesController } from './purchases/purchases.controller';
import { OrdersController } from './orders/orders.controller';
import { ExpensesController } from './expenses/expenses.controller';
import { InventoryController } from './inventory/inventory.controller';
import { DashboardController } from './dashboard/dashboard.controller';
import { BackupController } from './backup/backup.controller';
import { ExportController } from './export/export.controller';

@Module({controllers:[ProductsController,SitesController,PurchasesController,OrdersController,ExpensesController,InventoryController,DashboardController,BackupController,ExportController],providers:[PrismaService,FifoService]})
export class AppModule {}
