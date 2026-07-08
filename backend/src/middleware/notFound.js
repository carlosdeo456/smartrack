function notFoundHandler(req, res) {
  const message = `Route not found: ${req.method} ${req.originalUrl}`;
  res.status(404).json({
    success: false,
    error: {
      message,
      status: 404,
      hint: req.path === '/'
        ? 'This is the API server. Open https://smartrack-uxeb.vercel.app for the web app.'
        : 'Check the path starts with /api/ and REACT_APP_API_URL has no /api suffix.',
    },
  });
}

module.exports = notFoundHandler;
