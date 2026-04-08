/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['bcryptjs'],
  async redirects() {
    return [
      {
        source: '/dashboard/drive',
        destination: '/dashboard/workspace',
        permanent: true,
      },
      {
        source: '/dashboard/email',
        destination: '/dashboard/workspace',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
