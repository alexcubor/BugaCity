const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const dotenv = require('dotenv');

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';
  
  return {
    mode: isDevelopment ? 'development' : 'production',
    entry: './client/src/index.tsx',
    output: {
      path: path.resolve(__dirname, 'client/public'),
      filename: isDevelopment ? 'bundle.js' : '[name].[contenthash].js',
      clean: true, // Теперь безопасно очищать, так как статические файлы в отдельной папке
      publicPath: '/',
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
            filename: isDevelopment ? 'images/[name][ext]' : 'images/[name].[contenthash][ext]'
          }
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'templates/index.html'),
        filename: 'index.html',
        inject: true,
        scriptLoading: 'defer',
        minify: false // Отключаем минификацию чтобы сохранить VK скрипт
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, 'static/assets/images'),
            to: 'images'
          },
          {
            from: path.resolve(__dirname, 'static/assets/models'),
            to: 'models'
          },
          {
            from: path.resolve(__dirname, 'static/assets/textures'),
            to: 'textures'
          },
          {
            from: path.resolve(__dirname, 'static/assets/favicon.ico'),
            to: 'favicon.ico'
          },
          {
            from: path.resolve(__dirname, 'static/assets/fonts'),
            to: 'fonts'
          }
        ]
      }),
      new webpack.DefinePlugin({
        'process.env': JSON.stringify({
          ...dotenv.config({ path: isDevelopment ? '.env.dev' : '.env' }).parsed,
          NODE_ENV: JSON.stringify(process.env.NODE_ENV || (isDevelopment ? 'development' : 'production'))
        })
      })
    ],
    devServer: {
      static: {
        directory: path.join(__dirname, 'client/public'),
      },
    },
    // Оптимизации для разработки и продакшена
    optimization: isDevelopment ? {
      removeAvailableModules: false,
      removeEmptyChunks: false,
      splitChunks: false,
    } : {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          // Отдельный чанк для Babylon.js
          babylon: {
            test: /[\\/]node_modules[\\/]@babylonjs[\\/]/,
            name: 'babylon',
            chunks: 'all', // Все чанки, но с высоким приоритетом
            priority: 20,
            enforce: true, // Принудительно создавать чанк
          },
          // Остальные vendor библиотеки
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
        },
      },
      usedExports: true,
      sideEffects: false,
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
    // Source maps для продакшена
    devtool: isDevelopment ? false : 'source-map',
    // Явно указываем watch режим для development
    watch: isDevelopment,
    // Производительность
    performance: {
      hints: isDevelopment ? false : 'warning',
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
    },
  };
};
