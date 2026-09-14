package com.inop.backend.service;

import com.inop.backend.exception.FileStorageException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;

@Service
public class FileStorageService {

    @Value("${file.upload-dir}")
    private String uploadDir;

    public List<String> store(MultipartFile[] files) {
        List<String> storedPaths = new ArrayList<>();
        if (files == null || files.length == 0) {
            return storedPaths;
        }

        Path uploadPath = Paths.get(uploadDir);
        try {
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            for (MultipartFile file : files) {
                if (file == null || file.isEmpty()) {
                    continue;
                }
                String originalName = StringUtils.cleanPath(
                        file.getOriginalFilename() != null ? file.getOriginalFilename() : "file"
                );
                String filename = System.currentTimeMillis() + "-" + originalName;
                Path target = uploadPath.resolve(filename).normalize();
                Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
                storedPaths.add(uploadDir + "/" + filename);
            }
        } catch (IOException e) {
            throw new FileStorageException("Failed to store uploaded file", e);
        }
        return storedPaths;
    }
}