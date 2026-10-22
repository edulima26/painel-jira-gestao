/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // exceljs é CommonJS e não precisa ser empacotado pelo webpack; roda direto do node_modules no servidor.
    serverComponentsExternalPackages: ["exceljs"],
  },
};

export default nextConfig;
