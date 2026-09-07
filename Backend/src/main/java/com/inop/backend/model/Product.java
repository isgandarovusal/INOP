package com.inop.backend.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;


@Data
@NoArgsConstructor
@Document(collection = "products")
public class Product {

    @Id
    @JsonProperty("_id")
    private String id;

    private String title;

    private String description;

    private List<String> images = new ArrayList<>();

    public Product(String title, String description, List<String> images) {
        this.title = title;
        this.description = description;
        this.images = images != null ? images : new ArrayList<>();
    }
}
