const path = require('path');
const { merge } = require('webpack-merge');
const common = require('./webpack.common');
const TerserPlugin = require('terser-webpack-plugin');
const BundleAnalyzerPlugin =
    require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = merge(common, {
    mode: 'production',
    devtool: 'hidden-source-map',
    optimization: {
        minimizer: [
            new TerserPlugin({
                parallel: true,
                extractComments: {
                    banner: (licenseFile) => {
                        return `License information can be found in LICENSE and LICENSE-THIRD-PARTY`;
                    }
                }
            }),
            new BundleAnalyzerPlugin()
        ]
    },
    output: {
        path: path.join(__dirname, '../build/assets'),
        filename: 'cwr.js'
    }
});
