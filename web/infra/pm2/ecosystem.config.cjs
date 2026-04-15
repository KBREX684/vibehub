module.exports = {
  apps: [
    {
      name: "vibehub-web",
      cwd: "/srv/vibehub/web",
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
    {
      name: "vibehub-ws",
      cwd: "/srv/vibehub/web",
      script: "npm",
      args: "run ws:serve",
      env: {
        NODE_ENV: "production",
        WS_PORT: 3001,
        WS_PATH: "/ws",
      },
    },
    {
      name: "vibehub-mcp",
      cwd: "/srv/vibehub/web",
      script: "npm",
      args: "run mcp:serve",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
