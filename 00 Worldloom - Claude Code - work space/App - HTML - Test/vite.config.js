import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  // viteSingleFile incorpora JS e CSS dentro un unico index.html:
  // serve per poter aprire il gioco a doppio click, senza server.
  plugins: [react(), viteSingleFile()],
});
