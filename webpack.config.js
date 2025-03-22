import path, { resolve } from "path";
import MiniCssExtractPlugin from "mini-css-extract-plugin";

export default {
  mode: "development",
  entry: "./src/index.ts",
  output: {
    path: resolve("dist"),
    filename: "bundle.js",
    library: {
      type: "module",
    },
    clean: true,
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".css"],
    fullySpecified: false,
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

// TODO COPY YGO CORE
