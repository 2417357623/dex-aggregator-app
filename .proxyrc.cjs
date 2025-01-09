const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/api", // 指定代理的路径
    createProxyMiddleware({
      target: "https://api.0x.org", // 目标地址
      changeOrigin: true, // 修改请求头中的 Host 为目标服务器
      pathRewrite: {
        "^/api": "", // 移除 "/api" 前缀
      },
    })
  );
};
