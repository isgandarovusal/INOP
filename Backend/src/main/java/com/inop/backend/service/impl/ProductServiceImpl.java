package com.inop.backend.service.impl;

import com.inop.backend.dto.ProductRequest;
import com.inop.backend.dto.ProductResponse;
import com.inop.backend.exception.ProductNotFoundException;
import com.inop.backend.mapper.ProductMapper;
import com.inop.backend.model.Product;
import com.inop.backend.repository.ProductRepository;
import com.inop.backend.service.FileStorageService;
import com.inop.backend.service.ProductService;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.List;

@Service
public class ProductServiceImpl implements ProductService {

    private static final int MAX_IMAGES = 5;

    private final ProductRepository productRepository;
    private final FileStorageService fileStorageService;

    public ProductServiceImpl(ProductRepository productRepository, FileStorageService fileStorageService) {
        this.productRepository = productRepository;
        this.fileStorageService = fileStorageService;
    }

    @Override
    public List<ProductResponse> getAll() {
        return ProductMapper.toResponseList(productRepository.findAll());
    }

    @Override
    public ProductResponse getById(String id) {
        return ProductMapper.toResponse(findOrThrow(id));
    }

    @Override
    public ProductResponse create(ProductRequest request) {
        List<String> imagePaths = fileStorageService.store(limit(request.getImages()));
        Product product = new Product(request.getTitle(), request.getDescription(), imagePaths);
        return ProductMapper.toResponse(productRepository.save(product));
    }

    @Override
    public ProductResponse update(String id, ProductRequest request) {
        Product existing = findOrThrow(id);

        if (request.getTitle() != null) {
            existing.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            existing.setDescription(request.getDescription());
        }
        MultipartFile[] limited = limit(request.getImages());
        if (limited != null && limited.length > 0) {
            existing.setImages(fileStorageService.store(limited));
        }
        return ProductMapper.toResponse(productRepository.save(existing));
    }

    @Override
    public void delete(String id) {
        if (!productRepository.existsById(id)) {
            throw new ProductNotFoundException(id);
        }
        productRepository.deleteById(id);
    }

    private Product findOrThrow(String id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ProductNotFoundException(id));
    }

    private MultipartFile[] limit(MultipartFile[] images) {
        if (images == null || images.length <= MAX_IMAGES) {
            return images;
        }
        return Arrays.copyOf(images, MAX_IMAGES);
    }
}