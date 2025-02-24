import path from 'path';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

export default {
    entry: './src/index.ts',
    output: {
        path: path.resolve(process.cwd(), 'dist'),
        filename: 'index.js',
        library: {
            type: 'module'
        },
        clean: true
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.css'],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, 'css-loader'],
            },
        ],
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: 'style.css',
        }),
    ],
    experiments: {
        outputModule: true,
    }
};


// TODO COPY YGO CORE