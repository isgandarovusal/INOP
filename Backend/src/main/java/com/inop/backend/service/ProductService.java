package com.inop.backend.service;

import com.inop.backend.dto.ProductRequest;
import com.inop.backend.dto.ProductResponse;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public interface ProductService {
    List<ProductResponse> getAll();
    ProductResponse getById(String id);
    ProductResponse create(ProductRequest request);
    ProductResponse update(String id, ProductRequest request);
    void delete(String id);
}