const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const dotenv = require('dotenv');

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';
  
  return {
    mode: isDevelopment ? 'development' : 'production',
    entry: './client/src/index.tsx',
    output: {
      path: path.resolve(__dirname, 'client/public'),
      filename: 'bundle.js',
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: isDevelopment, // Быстрая компиляция в dev режиме
              compilerOptions: {
                noEmit: false,
              }
            }
          },
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg)$/,
          type: 'asset/resource',
          generator: {
            filename: 'images/[name][ext]'
          }
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
    },
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, 'client/public/images'),
            to: 'images'
          }
        ]
      }),
      new webpack.DefinePlugin({
        'process.env': JSON.stringify({
          ...dotenv.config({ path: '.env.dev' }).parsed,
          NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development')
        })
      })
    ],
    devServer: {
      static: {
        directory: path.join(__dirname, 'client/public'),
      },
    },
    // Оптимизации для разработки
    optimization: {
      removeAvailableModules: false,
      removeEmptyChunks: false,
      splitChunks: false,
    },
    // Кэширование для ускорения
    cache: {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename],
      },
    },
    // Исключения для watch
    watchOptions: {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/.DS_Store'
      ],
      poll: 1000, // Включаем polling для надежности
      aggregateTimeout: 300,
    },
    // Убираем source maps в dev для ускорения
    devtool: isDevelopment ? false : 'source-map',
    // Явно указываем watch режим для development
    watch: isDevelopment,
  };
};
