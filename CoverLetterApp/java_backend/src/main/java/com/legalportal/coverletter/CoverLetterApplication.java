package com.legalportal.coverletter;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class CoverLetterApplication {
    public static void main(String[] args) {
        SpringApplication.run(CoverLetterApplication.class, args);
    }
}
