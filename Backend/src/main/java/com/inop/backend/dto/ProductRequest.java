package com.inop.backend.dto;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;


@Data
public class ProductRequest {
    private String title;
    private String description;
    private MultipartFile[] images;
}