function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      status: 404,
    },
  });
}

module.exports = notFoundHandler;
