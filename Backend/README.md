# INOP Backend — Spring Boot (Java) port

A 1:1 port of the original Express/Mongoose backend to Spring Boot, keeping
**MongoDB** as the database so no data migration or frontend changes are
needed.

## Stack
- Java 21
- Spring Boot 3.3.4 (Web, Validation)
- Spring Data MongoDB
- Gradle (Groovy DSL)
- Lombok

## Project layout
```
src/main/java/com/inop/backend/
├── BackendApplication.java        # entry point
├── model/Product.java             # @Document, mirrors the Mongoose schema
├── repository/ProductRepository.java
├── controller/ProductController.java   # /products routes
├── service/FileStorageService.java     # replicates multer's disk storage
└── config/
    ├── WebConfig.java             # CORS + /uploads static mapping
    └── GlobalExceptionHandler.java
src/main/resources/application.yml
uploads/                            # uploaded images land here (gitignored)
```

## Endpoint mapping (unchanged from the Node API)
| Method | Path            | Notes                                             |
|--------|-----------------|----------------------------------------------------|
| GET    | `/products`     | list all                                          |
| GET    | `/products/{id}`| one product, 404 if missing                       |
| POST   | `/products`     | `multipart/form-data`: `title`, `description`, up to 5 `images` files |
| PUT    | `/products/{id}`| same fields, all optional; images replace old ones if sent |
| DELETE | `/products/{id}`| deletes and returns the remaining list            |

Uploaded files are served back at `/uploads/<filename>`, exactly like
`express.static("uploads")` did — so `${API_URL}/${product.images[0]}` in the
React frontend keeps working with zero changes.

The `_id` field is preserved in the JSON output (`@JsonProperty("_id")` on the
id field) so `item._id` in the frontend still resolves correctly.

## Configuration
Same environment variable names as the original `.env`, so an existing `.env`
can be reused as-is:

| Variable | Default                              | Meaning              |
|----------|---------------------------------------|----------------------|
| `PORT`   | `2000`                                | HTTP port            |
| `CS`     | `mongodb://localhost:27017/fbdb`      | Mongo connection URI |
| `UPLOAD_DIR` | `uploads`                          | where files are stored |

## Running locally
Requires JDK 21 and Gradle 8+ (or open the folder in IntelliJ IDEA, which
downloads Gradle automatically — no wrapper needed).

```bash
export PORT=2000
export CS=mongodb://localhost:27017/fbdb
gradle bootRun
```

Or generate the wrapper once and use it from then on:
```bash
gradle wrapper --gradle-version 8.10
./gradlew bootRun
```

## Running with Docker / docker-compose
The `Dockerfile` here is a drop-in replacement for `Backend/Dockerfile`.
In the repo's root `docker-compose.yml`, point the `backend` service at this
folder instead:

```yaml
  backend:
    build:
      context: ./backend-spring
      dockerfile: Dockerfile
    ports:
      - "2001:2000"
    environment:
      - PORT=2000
      - CS=mongodb://mongo:27017/fbdb
    depends_on:
      - mongo
    volumes:
      - ./backend-spring/uploads:/app/uploads
```

Everything else (mongo service, frontend service, `VITE_API_URL`) stays the
same, since the API surface is identical to the original backend.

## Behavior notes / small improvements over the original
- HTTP status codes follow standard conventions (`200`, `201` on create,
  `404` when a product isn't found, `500` on unexpected errors) instead of
  always returning `404` on any failure.
- Missing required multipart fields now return a clear `400` with a message
  instead of an unhandled exception.
