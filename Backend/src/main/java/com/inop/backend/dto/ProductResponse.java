package com.inop.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;


@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductResponse {

    @JsonProperty("_id")
    private String id;
    private String title;
    private String description;
    private List<String> images;
}