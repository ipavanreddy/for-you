/** @type {import('next').NextConfig} */
const nextConfig = {
  // A folder of plain HTML/CSS/JS, so GitHub Pages can serve it with no server.
  output: 'export',
  // GitHub Pages serves a project site from a sub-path.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  // Emits /index.html per route, which is what Pages expects.
  trailingSlash: true,
  reactStrictMode: true,
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
