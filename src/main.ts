import { App } from "./ui/App";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Application root not found.");

new App(root);
