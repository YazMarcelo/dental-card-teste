/** @type {import('next').NextConfig} */
const nextConfig = {
  // Gera um build "standalone" — o Dockerfile copia só o necessário pra rodar.
  output: "standalone",
  reactStrictMode: true,
};

export default nextConfig;
