# Shopee 利润与库存记账系统

完整安装、启动和维护说明见 [用户手册](./用户手册.md)。

双击启动器：

- macOS：`start-macos.command`
- Windows：`start-windows.bat`

## 环境要求

- Node.js 20 或更高版本
- pnpm 11

如果终端提示 `command not found: pnpm`，可通过 Corepack 启用：

```bash
corepack prepare pnpm@11.19.0 --activate
pnpm --version
```

如果当前 Node.js 没有提供 Corepack，可以直接使用，无需全局安装：

```bash
npx -y pnpm@11.19.0 --version
```

## 本地运行

```bash
cp .env.example apps/api/.env
pnpm install
pnpm db:push
pnpm dev
```

使用 `npx` 时，对应命令为：

```bash
npx -y pnpm@11.19.0 db:push
npx -y pnpm@11.19.0 dev
```

前端默认 http://localhost:5173，API 与 Swagger 分别为 http://localhost:3000/api 和 http://localhost:3000/docs。

在“系统设置 → 导出 Excel 报表”中选择日期范围，可下载包含汇总、商品、站点、映射、采购批次、库存快照、销售订单、FIFO 分摊、广告和提现等多个 Sheet 的统一工作簿。

Docker 运行：

```bash
docker compose up --build
```

访问 http://localhost:8080。数据保存在 Docker volume `shopee-data` 中。

金额通过 Prisma Decimal 处理；销售成本按采购日期、创建时间执行 FIFO。修改历史采购或销售时会在事务中重建相关 SKU 的全部库存分配。
