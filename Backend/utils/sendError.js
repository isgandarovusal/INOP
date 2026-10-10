function sendError(res, error, fallback = "Request failed.") {
  if (error?.name === "ValidationError" || error?.name === "CastError") {
    return res.status(400).json({ success: false, message: "Invalid request data." });
  }
  if (error?.code === 11000) {
    return res.status(409).json({ success: false, message: "This record already exists." });
  }
  if (error?.status >= 400 && error.status < 500) {
    return res.status(error.status).json({ success: false, message: error.message });
  }
  if (error?.status === 503 || error?.status === 504) {
    return res.status(error.status).json({ success: false,
      message: error.status === 503 ? "Service temporarily unavailable. Try again later." : "Processing timed out. Try again later." });
  }
  console.error(`Request failed (${error?.name || "Error"}).`);
  return res.status(500).json({ success: false, message: fallback });
}

module.exports = { sendError };
