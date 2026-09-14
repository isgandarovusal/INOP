package com.inop.backend.mapper;

import com.inop.backend.dto.ProductResponse;
import com.inop.backend.model.Product;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public final class ProductMapper {

    private ProductMapper() {
    }

    public static ProductResponse toResponse(Product product) {
        return new ProductResponse(
                product.getId(),
                product.getTitle(),
                product.getDescription(),
                product.getImages()
        );
    }

    public static List<ProductResponse> toResponseList(List<Product> products) {
        return products.stream().map(ProductMapper::toResponse).toList();
    }
}