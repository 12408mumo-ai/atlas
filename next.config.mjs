/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      // The standalone Flow Wave Three.js scene lives as a single static file.
      { source: "/flow-wave", destination: "/flow-wave/index.html" },
    ];
  },
  async headers() {
    return [
      {
        source: "/flow-wave/:path*",
        headers: [
          { key: "Cross-Origin-Embedder-Policy", value: "unsafe-none" },
          { key: "X-Frame-Options", value: "ALLOWALL" },
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://*.e2b.app https://*.arena.ai; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline';",
          },
        ],
      },
    ];
  },
};
export default nextConfig;
