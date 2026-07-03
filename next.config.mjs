/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer, webpack }) => {
    // pptxgenjs statically imports `node:fs` / `node:https` for its Node
    // file-write path. Rewrite the `node:` scheme to the bare specifier so
    // webpack's resolver handles it (on the server it resolves to the real
    // module; in the browser the fallbacks below stub it out — we only use the
    // Blob/download path there).
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
        resource.request = resource.request.replace(/^node:/, "");
      })
    );
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        https: false,
        http: false,
        path: false,
        stream: false,
        zlib: false,
        util: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;