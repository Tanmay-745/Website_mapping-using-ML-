package com.legalportal.coverletter.service;

import com.legalportal.coverletter.model.JobStatus;
import com.opencsv.CSVReader;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import org.xhtmlrenderer.pdf.ITextRenderer;

import java.io.ByteArrayOutputStream;
import java.io.InputStreamReader;
import java.io.FileOutputStream;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Base64;

@Service
public class PdfService {

    @Autowired
    private TemplateEngine templateEngine;

    @Async
    public void processCSVAndGeneratePDFs(MultipartFile csvFile, MultipartFile headerImage, String jobId, Map<String, String> senderInfo, Map<String, JobStatus> jobs) {
        JobStatus job = jobs.get(jobId);
        try {
            job.setStatus("Reading CSV...");
            List<Map<String, String>> envelopesData = new ArrayList<>();
            
            try (CSVReader reader = new CSVReader(new InputStreamReader(csvFile.getInputStream()))) {
                String[] headers = reader.readNext();
                if (headers == null) throw new Exception("Empty CSV");

                String[] line;
                while ((line = reader.readNext()) != null) {
                    if (job.getIsCancelled()) break;
                    
                    Map<String, String> row = new HashMap<>();
                    for (int i = 0; i < headers.length; i++) {
                        if (i < line.length) row.put(headers[i].toLowerCase(), line[i]);
                    }
                    
                    String lan = row.getOrDefault("barcode", row.getOrDefault("lan", row.getOrDefault("id", "UNKNOWN")));
                    String name = row.getOrDefault("name", "");
                    String address = row.getOrDefault("address", row.getOrDefault("applicantaddress", ""));
                    String phone = row.getOrDefault("mobile number", row.getOrDefault("applicantmobileno", ""));

                    // Prepare envelope record
                    Map<String, String> envData = new HashMap<>();
                    envData.put("name", name);
                    envData.put("address", address);
                    envData.put("phone", phone);
                    envData.put("lan", lan);
                    // In a production system, use barcode4j to generate the barcode Base64.
                    envData.put("barcode", ""); 
                    envelopesData.add(envData);
                    job.setProgress(envelopesData.size());
                }
            }
            job.setTotal(envelopesData.size());
            job.setStatus("Generating final PDF document...");

            // Logic to fetch Logo Base64
            String logoDataUri = "";
            if (headerImage != null && !headerImage.isEmpty()) {
                logoDataUri = "data:image/png;base64," + Base64.getEncoder().encodeToString(headerImage.getBytes());
            }

            // Create context for Thymeleaf
            Context context = new Context();
            context.setVariable("envelopes", envelopesData);
            context.setVariable("sender", senderInfo);
            context.setVariable("logoDataUri", logoDataUri);

            // Render HTML using Thymeleaf
            String htmlContent = templateEngine.process("cover_template", context);

            // Create PDF using Flying Saucer OpenPDF
            String outputDir = "generated-pdfs/" + csvFile.getOriginalFilename().split("\\.")[0];
            Files.createDirectories(Paths.get(outputDir));
            String mergedFileName = "merged_" + System.currentTimeMillis() + ".pdf";
            Path pdfPath = Paths.get(outputDir, mergedFileName);

            try (FileOutputStream os = new FileOutputStream(pdfPath.toFile())) {
                ITextRenderer renderer = new ITextRenderer();
                renderer.setDocumentFromString(htmlContent);
                renderer.layout();
                renderer.createPDF(os);
            }

            job.setResultPdfUrl("/" + outputDir + "/" + mergedFileName);
            job.setPagesGenerated(envelopesData.size());
            job.setDone(true);
            job.setStatus("Generation Complete");

        } catch (Exception e) {
            job.setError(e.getMessage());
            job.setDone(true);
        }
    }
}
