import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(){
 const app=await NestFactory.create(AppModule);
 app.setGlobalPrefix('api');app.enableCors();
 const config=new DocumentBuilder().setTitle('Shopee Ledger API').setVersion('1.0').build();
 SwaggerModule.setup('docs',app,SwaggerModule.createDocument(app,config));
 await app.listen(process.env.PORT||3000);
}
bootstrap();
