<script setup lang="ts">
import {ref} from 'vue';
import {ElMessage} from 'element-plus';
import PageHeader from '@/components/PageHeader.vue';

const now=new Date();
const firstDay=new Date(now.getFullYear(),now.getMonth(),1);
const iso=(d:Date)=>{const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`};
const dateRange=ref<[string,string]>([iso(firstDay),iso(now)]);
const exporting=ref(false);
function backup(){window.location.href='/api/backup'}
async function exportExcel(){
  if(!dateRange.value?.[0]||!dateRange.value?.[1])return ElMessage.warning('请选择导出日期范围');
  exporting.value=true;
  try{
    const params=new URLSearchParams({start:dateRange.value[0],end:dateRange.value[1]});
    const response=await fetch(`/api/export?${params}`);
    if(!response.ok){const error=await response.json().catch(()=>({message:'导出失败'}));throw new Error(error.message||'导出失败')}
    const blob=await response.blob();
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;link.download=`shopee-ledger-${dateRange.value[0]}_${dateRange.value[1]}.xlsx`;
    document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
    ElMessage.success('Excel 报表已导出');
  }catch(error:any){ElMessage.error(error.message||'导出失败')}finally{exporting.value=false}
}
</script>
<template>
  <PageHeader title="系统设置" subtitle="数据导出、备份与账务口径"/>
  <div class="grid gap-5 lg:grid-cols-2">
    <el-card shadow="never">
      <template #header><div class="font-bold">导出 Excel 报表</div></template>
      <p class="mb-5 text-sm leading-6 text-slate-500">选择日期范围，将汇总、主数据、采购、库存、订单、FIFO 分摊、广告和提现分别导出到同一工作簿的不同 Sheet。</p>
      <el-form label-position="top">
        <el-form-item label="数据日期范围">
          <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" class="!w-full"/>
        </el-form-item>
        <el-alert type="info" :closable="false" show-icon class="mb-5" title="商品、站点和映射导出完整主数据；库存导出当前时点的全部批次快照。"/>
        <el-button type="primary" :loading="exporting" @click="exportExcel">导出 Excel</el-button>
      </el-form>
    </el-card>
    <el-card shadow="never">
      <template #header><div class="font-bold">数据库备份</div></template>
      <p class="mb-5 text-sm leading-6 text-slate-500">下载当前 SQLite 数据库文件。建议每次大批量修改采购或订单前进行备份。</p>
      <el-button @click="backup">下载数据库备份</el-button>
    </el-card>
    <el-card shadow="never" class="lg:col-span-2">
      <template #header><div class="font-bold">账务口径</div></template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="库存与销售成本">采购批次 FIFO</el-descriptions-item>
        <el-descriptions-item label="包材成本">跟随采购批次</el-descriptions-item>
        <el-descriptions-item label="汇率">订单创建时保存快照</el-descriptions-item>
        <el-descriptions-item label="提现">资金划转，不计入利润</el-descriptions-item>
        <el-descriptions-item label="平台费">到账已扣，不重复扣除</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>
