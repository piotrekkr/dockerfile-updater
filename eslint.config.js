// eslint.config.js
import { defineConfig } from "eslint/config";

export default defineConfig([
	{
		ignores: [
            "lib/**",
            "dist/**",
            "node_modules/**",
            "coverage/**",
        ]
	},
]);
