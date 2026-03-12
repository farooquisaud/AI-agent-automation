const port = process.env.PORT || 3000;

module.exports = {
  apps: [
    {
      name: "frontend",
      script: "node_modules/next/dist/bin/next",
      args: `start -p ${port}`,
      cwd: "C:/Projects/ai-agent-automation/frontend",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: port,
      },
    },
  ],
};
