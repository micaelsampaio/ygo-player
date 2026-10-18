import path from "path";
import { fileURLToPath } from "url";
import MiniCssExtractPlugin from "mini-css-extract-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: "development",
  entry: "./src/index.ts",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "index.js",
    library: {
      type: "module",
    },
    clean: true,
  },
  // React comes from the host app (a peerDependency), so the page runs one
  // copy of it. three and ygo-core stay bundled: ygo101-web does not depend on
  // three, and its docker build drops dist/index.js straight into node_modules.
  externalsType: "module",
  externals: {
    react: "react",
    "react-dom": "react-dom",
    "react-dom/client": "react-dom/client",
    "react/jsx-runtime": "react/jsx-runtime",
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".css"],
    fullySpecified: false
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
      {
        test: /\.m?js/,
        resolve: {
          fullySpecified: false,
        },
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "style.css",
    }),
  ],
  experiments: {
    outputModule: true,
  },
};
