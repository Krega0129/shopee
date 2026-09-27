import {createRouter,createWebHistory} from 'vue-router';
const routes=[['/','DashboardView'],['/products','ProductsView'],['/sites','SitesView'],['/purchases','PurchasesView'],['/inventory','InventoryView'],['/orders','OrdersView'],['/cashflow','CashflowView'],['/settings','SettingsView']].map(([path,name])=>({path,name,component:()=>import(`./views/${name}.vue`)}));
export default createRouter({history:createWebHistory(),routes});
