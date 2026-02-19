import { createApp } from "vue";
import "@mdi/font/css/materialdesignicons.css";
import "vuetify/styles";
import App from "./App.vue";
import { vuetify } from "@/plugins/vuetify";
import "@/styles/main.css";

createApp(App).use(vuetify).mount("#app");
