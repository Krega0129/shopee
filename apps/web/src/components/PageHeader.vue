<script setup lang="ts">defineProps<{title:string,subtitle:string}>()</script>
<template><div class="mb-6 flex flex-wrap items-end justify-between gap-4"><div><h1 class="text-2xl font-bold tracking-tight">{{title}}</h1><p class="mt-1 text-sm text-slate-500">{{subtitle}}</p></div><slot/></div></template>
