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
  ],
};
