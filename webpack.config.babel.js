import * as path from 'path';

export default {
  entry: {
    options: './options.js',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'build'),
  },
  mode: 'development',
};
