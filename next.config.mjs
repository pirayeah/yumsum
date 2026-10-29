/** @type {import('next').NextConfig} */
const nextConfig = {
  // A plain static site for GitHub Pages; the GitHub Action sets the base path to /<repo-name>.
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  trailingSlash: true,
};

export default nextConfig;
