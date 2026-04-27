package com.legalportal.coverletter.controller;

import com.legalportal.coverletter.model.JobStatus;
import com.legalportal.coverletter.service.PdfService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.UUID;
import java.util.HashMap;

@RestController
@CrossOrigin(origins = "*")
public class CoverLetterController {

    private final Map<String, JobStatus> jobs = new ConcurrentHashMap<>();

    @Autowired
    private PdfService pdfService;

    @PostMapping("/generate-pdfs")
    public ResponseEntity<Map<String, Object>> generatePdfs(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "headerImage", required = false) MultipartFile headerImage,
            @RequestParam("senderFrom") String senderFrom,
            @RequestParam(value = "senderMobile", required = false) String senderMobile,
            @RequestParam(value = "senderAddress", required = false) String senderAddress) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "CSV file is required"));
        }

        String jobId = String.valueOf(System.currentTimeMillis());
        JobStatus job = new JobStatus(jobId);
        jobs.put(jobId, job);

        Map<String, String> senderInfo = new HashMap<>();
        senderInfo.put("from", senderFrom);
        senderInfo.put("mobile", senderMobile);
        senderInfo.put("address", senderAddress);

        // Async execution
        pdfService.processCSVAndGeneratePDFs(file, headerImage, jobId, senderInfo, jobs);

        return ResponseEntity.ok(Map.of("jobId", jobId, "message", "PDF generation started"));
    }

    @GetMapping("/status/{jobId}")
    public ResponseEntity<?> getStatus(@PathVariable String jobId) {
        JobStatus job = jobs.get(jobId);
        if (job == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Job not found"));
        }
        return ResponseEntity.ok(job);
    }

    @PostMapping("/cancel/{jobId}")
    public ResponseEntity<?> cancelJob(@PathVariable String jobId) {
        JobStatus job = jobs.get(jobId);
        if (job != null) {
            job.setIsCancelled(true);
            return ResponseEntity.ok(Map.of("success", true));
        }
        return ResponseEntity.status(404).body(Map.of("error", "Job not found"));
    }
}
