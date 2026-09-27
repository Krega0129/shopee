import { BadRequestException, Controller, Get, Header, StreamableFile } from '@nestjs/common';
import { createReadStream, existsSync } from 'fs';
import { resolve } from 'path';

@Controller('backup')
export class BackupController {
 @Get() @Header('Content-Type','application/octet-stream') @Header('Content-Disposition','attachment; filename="shopee-ledger.db"') download(){const raw=process.env.DATABASE_URL||'file:./prisma/dev.db';const path=resolve(process.cwd(),raw.replace(/^file:/,''));if(!existsSync(path))throw new BadRequestException('数据库文件不存在');return new StreamableFile(createReadStream(path));}
}
