<script setup lang="ts">const props=defineProps<{open:boolean,title:string,width?:string}>();const emit=defineEmits(['close']);</script>
<template><el-dialog :model-value="props.open" :title="title" :width="width||'640px'" destroy-on-close align-center @close="emit('close')"><slot/></el-dialog></template>
