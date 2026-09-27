# Shopee Ledger AI 项目指南

本文件供接手该仓库的 AI/自动化开发代理阅读。开始修改前，请先理解以下业务口径、架构和验证要求。

## 1. 项目目标

这是一个本机免登录、单用户的 Shopee 利润与库存记账系统，主要管理：

- 商品及参考成本。
- Shopee 站点、店铺、币种、汇率和平台费率。
- 采购批次及产品/包材批次成本。
- FIFO 库存和订单成本分摊。
- 售出订单、到账金额、毛利和毛利率。
- 广告投入、提现及手续费。
- 经营看板、SQLite 备份和多 Sheet Excel 导出。

首版不包含用户登录、多用户权限、退货退款、报损、盘点、多仓库或 Shopee Excel 自动导入。

## 2. 技术栈与目录

项目使用 pnpm workspace：

```text
apps/api       NestJS + Prisma + SQLite 后端
apps/web       Vue 3 + TypeScript + Vite + Element Plus + Tailwind + ECharts
packages/shared 共享 TypeScript 类型
```

关键文件：

- `apps/api/prisma/schema.prisma`：数据库模型。
- `apps/api/src/inventory/fifo.service.ts`：FIFO 重建和成本核算核心。
- `apps/api/src/orders/orders.controller.ts`：销售订单写入及重算入口。
- `apps/api/src/purchases/purchases.controller.ts`：采购批次写入及重算入口。
- `apps/api/src/export/export.controller.ts`：多 Sheet Excel 导出。
- `apps/web/src/router.ts`：前端路由。
- `apps/web/src/views/`：业务页面。
- `start-macos.command`、`start-windows.bat`：双击启动器。
- `用户手册.md`：面向最终用户的安装与使用说明。

## 3. 本地运行

要求 Node.js 20+ 和 pnpm 11。

```bash
cp .env.example apps/api/.env
pnpm install
pnpm db:push
pnpm dev
```

地址：

- 前端：http://127.0.0.1:5173
- API：http://127.0.0.1:3000/api
- Swagger：http://127.0.0.1:3000/docs

也可双击对应平台的启动脚本。Docker 入口是 http://localhost:8080。

## 4. 数据与安全

- 本地数据库文件是 `apps/api/prisma/dev.db`。
- `.env`、`*.db`、`node_modules`、`dist` 和构建缓存不得提交。
- 不要覆盖、删除或重建用户数据库，除非用户明确授权。
- 修改 Prisma schema 后使用 `pnpm db:push`；涉及正式数据时先建议备份。
- 当前系统没有鉴权，只适用于本机或可信私有网络，不应直接暴露到公网。
- 金额通过 Prisma Decimal/decimal.js 处理；禁止使用普通 JavaScript 浮点运算作为权威账务结果。

## 5. 核心业务口径

### 商品参考成本

- `referenceProductCost` 和 `referencePackagingCost` 仅用于参考、预估和采购录入默认值。
- 商品参考成本不会根据采购自动计算平均价。
- 商品参考成本不参与已有订单的实际利润核算。

### 采购与库存

- 每条采购明细生成独立 `InventoryBatch`。
- 批次同时保存产品采购单价和包材成本/件。
- 包材跟随商品批次，不作为独立物料库存。
- 批次综合单价 = 产品单价 + 包材单价。
- FIFO 顺序为采购日期、批次创建时间、批次 ID。

### 售出订单

- 一个内部销售记录对应一个 SKU。
- 外部订单含多个 SKU 时，使用相同订单号和不同 `lineNo`。
- 订单唯一约束为 `orderNo + lineNo`。
- 站点币种、汇率和平台费率在创建/编辑订单时保存快照。
- 汇率定义为 1 单位站点币种可兑换多少 CNY。
- 平台到账金额视为已扣平台费，平台费率快照不再次参与扣费。

权威计算公式：

```text
CNY 到账 = 原币到账 × 汇率快照
产品成本 = Σ(FIFO 分配数量 × 批次产品单价)
包材成本 = Σ(FIFO 分配数量 × 批次包材单价)
综合成本 = 产品成本 + 包材成本
订单成本 = 综合成本 + 订单其他费用
订单毛利 = CNY 到账 - 订单成本
订单毛利率 = 订单毛利 / CNY 到账
```

CNY 到账为零时，毛利率必须为 `null`，不得除零或显示虚假百分比。

### 广告、提现和净盈亏

- 广告费用计入期间损益。
- 提现是资金划转，不作为收入或利润。
- 提现手续费计入期间损益。
- 净盈亏 = 销售毛利 - 广告投入 - 提现手续费。

## 6. FIFO 不变量

`FifoService.rebuild()` 是库存分配的唯一权威入口。修改相关逻辑时必须保持：

1. 重建前删除该 SKU 的旧 `InventoryAllocation`。
2. 所有批次剩余数量先恢复到入库数量。
3. 所有销售按销售日期、创建时间、ID 顺序重新分配。
4. 每条分摊保存产品单价、包材单价和成本快照。
5. 库存不足时抛出错误，整个数据库事务必须回滚。
6. 新增、修改、删除采购或订单后，都要重建受影响的全部 SKU。
7. 修改订单商品时，需要同时重建旧 SKU 和新 SKU。
8. 历史补录必须重新影响其后的 FIFO 分配，不能只增量扣减当前库存。

不要在 Controller 或其他服务中直接手工修改 `remainingQuantity` 或绕开 FIFO 服务创建分摊。

## 7. API 与前端约定

- API 全局前缀为 `/api`。
- 前端开发环境通过 Vite 将 `/api` 代理到端口 3000。
- 金额 API 值按十进制定点语义处理；不要随意改为二进制浮点字段。
- Element Plus 是表格、表单、弹窗、日期和选择控件的标准组件库。
- Tailwind 主要用于布局和少量视觉调整，不要重新引入大批手写表单/表格样式。
- 保持中文 UI 文案，并兼顾桌面和平板宽度。
- 删除或修改会影响账务的数据时，需要明确确认和错误提示。

## 8. Excel 导出口径

`GET /api/export?start=YYYY-MM-DD&end=YYYY-MM-DD` 返回一个 `.xlsx` 工作簿。

- 采购、销售订单、FIFO 分摊、广告和提现按日期范围筛选。
- 商品、站点和站点商品映射导出完整主数据。
- 库存 Sheet 是导出时点的全部当前批次快照，不受日期范围限制。
- 日期、金额、数量和百分比必须写成 Excel 原生数据类型并设置格式，不要导出为显示字符串。
- 新增字段时同步考虑 Excel Sheet、用户手册和前端页面。

## 9. 修改后的最低验证

提交代码前至少运行：

```bash
pnpm test
pnpm build
```

涉及数据库/FIFO 时还应验证：

1. 两个不同产品和包材成本的采购批次。
2. 一笔销售跨越两个批次。
3. FIFO 分摊数量、产品成本、包材成本及订单毛利。
4. 库存不足时事务回滚。
5. 编辑/删除订单后库存恢复。
6. 补录历史采购或订单后后续分配重建。

涉及 Excel 导出时，应实际下载并重新读取工作簿，检查 Sheet 名称、记录数、日期格式和金额字段。

涉及 UI 时，应在真实浏览器中检查空数据、加载、错误、弹窗及窄屏表格表现。

## 10. 代码修改原则

- 先阅读相关模型、Controller、FIFO 服务和页面，不要凭字段名称猜测账务含义。
- 保持修改范围聚焦，避免无关重构。
- 数据库写操作优先放在 Prisma transaction 中。
- 保留用户现有数据和未要求修改的行为。
- 不要提交真实数据库、密钥、令牌或本机环境配置。
- 新增用户可见功能时同步更新 `README.md` 或 `用户手册.md`。
- 如果修改启动命令、端口或依赖安装方式，同步更新两个双击启动脚本。
