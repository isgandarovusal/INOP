const swaggerJsdoc = require("swagger-jsdoc")

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "INOP API",
            version: "1.0.0",
            description: "INOP Product Management API"
        },
        servers: [
            {
                url: "http://localhost:2000"
            }
        ],
        components: {
            schemas: {
                Product: {
                    type: "object",
                    required: ["title", "description"],
                    properties: {
                        _id: {
                            type: "string",
                            example: "66c123456789abcdef123456"
                        },
                        title: {
                            type: "string",
                            example: "Arthur"
                        },
                        description: {
                            type: "string",
                            example: "Product description"
                        },
                        images: {
                            type: "array",
                            items: {
                                type: "string"
                            },
                            example: [
                                "uploads/image1.jpg",
                                "uploads/image2.jpg"
                            ]
                        }
                    }
                }
            }
        },
        paths: {
            "/products": {
                get: {
                    summary: "Get all products",
                    responses: {
                        200: {
                            description: "List of products",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "array",
                                        items: {
                                            $ref: "#/components/schemas/Product"
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                post: {
                    summary: "Create a product",
                    requestBody: {
                        required: true,
                        content: {
                            "multipart/form-data": {
                                schema: {
                                    type: "object",
                                    required: ["title", "description"],
                                    properties: {
                                        title: {
                                            type: "string"
                                        },
                                        description: {
                                            type: "string"
                                        },
                                        images: {
                                            type: "array",
                                            items: {
                                                type: "string",
                                                format: "binary"
                                            },
                                            maxItems: 5
                                        }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        200: {
                            description: "Product created successfully"
                        }
                    }
                }
            },

            "/products/{id}": {
                get: {
                    summary: "Get one product",
                    parameters: [
                        {
                            name: "id",
                            in: "path",
                            required: true,
                            schema: {
                                type: "string"
                            }
                        }
                    ],
                    responses: {
                        200: {
                            description: "Product found"
                        },
                        404: {
                            description: "Product not found"
                        }
                    }
                },

                put: {
                    summary: "Update a product",
                    parameters: [
                        {
                            name: "id",
                            in: "path",
                            required: true,
                            schema: {
                                type: "string"
                            }
                        }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            "multipart/form-data": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        title: {
                                            type: "string"
                                        },
                                        description: {
                                            type: "string"
                                        },
                                        images: {
                                            type: "array",
                                            items: {
                                                type: "string",
                                                format: "binary"
                                            },
                                            maxItems: 5
                                        }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        200: {
                            description: "Product updated successfully"
                        }
                    }
                },

                delete: {
                    summary: "Delete a product",
                    parameters: [
                        {
                            name: "id",
                            in: "path",
                            required: true,
                            schema: {
                                type: "string"
                            }
                        }
                    ],
                    responses: {
                        200: {
                            description: "Product deleted successfully"
                        },
                        404: {
                            description: "Product not found"
                        }
                    }
                }
            }
        }
    },
    apis: []
}

module.exports = swaggerJsdoc(options)
