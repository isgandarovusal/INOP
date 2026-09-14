const multer = require("multer");

function apiErrorPayload(message, extras = {}) {
  return {
    success: false,
    message,
    ...extras,
  };
}


function standardizeErrorResponses(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    if (
      res.statusCode >= 400 &&
      body &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      body.success === undefined
    ) {
      return originalJson({
        success: false,
        ...body,
      });
    }

    return originalJson(body);
  };

  next();
}

function notFoundHandler(req, res) {
  return res.status(404).json(
    apiErrorPayload("API endpoint tapılmadı.", {
      code: "NOT_FOUND",
      path: req.originalUrl,
    })
  );
}

function globalErrorHandler(error, req, res, _next) {
  console.error("Unhandled API error:", error);

  if (res.headersSent) {
    return;
  }

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json(
        apiErrorPayload("Yüklənən fayl maksimum ölçünü keçir.", {
          code: error.code,
        })
      );
    }

    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json(
        apiErrorPayload(
          "Fayl sahəsi və ya fayl formatı düzgün deyil.",
          { code: error.code, field: error.field || null }
        )
      );
    }

    return res.status(400).json(
      apiErrorPayload("Fayl yüklənərkən xəta baş verdi.", {
        code: error.code || "UPLOAD_ERROR",
      })
    );
  }

  if (error?.name === "ValidationError") {
    const fields = Object.keys(error.errors || {});

    return res.status(400).json(
      apiErrorPayload("Məlumat validasiyadan keçmədi.", {
        code: "VALIDATION_ERROR",
        fields,
      })
    );
  }

  if (error?.name === "CastError") {
    return res.status(400).json(
      apiErrorPayload("Sorğudakı identifikator düzgün deyil.", {
        code: "INVALID_ID",
      })
    );
  }

  if (error?.code === 11000) {
    return res.status(409).json(
      apiErrorPayload("Bu məlumat artıq mövcuddur.", {
        code: "DUPLICATE_VALUE",
        fields: Object.keys(error.keyPattern || error.keyValue || {}),
      })
    );
  }

  const statusCode = Number(error?.statusCode || error?.status || 500);
  const safeStatus = statusCode >= 400 && statusCode <= 599 ? statusCode : 500;
  const isProduction = process.env.NODE_ENV === "production";

  return res.status(safeStatus).json(
    apiErrorPayload(
      safeStatus >= 500
        ? "Server xətası baş verdi."
        : error?.message || "Sorğu emal edilə bilmədi.",
      {
        code: error?.code || (safeStatus >= 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_ERROR"),
        ...(isProduction || !error?.message
          ? {}
          : { detail: error.message }),
      }
    )
  );
}

module.exports = {
  apiErrorPayload,
  standardizeErrorResponses,
  notFoundHandler,
  globalErrorHandler,
};
