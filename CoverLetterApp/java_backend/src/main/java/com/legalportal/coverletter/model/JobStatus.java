package com.legalportal.coverletter.model;

public class JobStatus {
    private String jobId;
    private boolean isCancelled;
    private boolean done;
    private int progress;
    private int total;
    private String resultPdfUrl;
    private String error;
    private String status;
    private int pagesGenerated;

    public JobStatus(String jobId) {
        this.jobId = jobId;
        this.status = "Reading CSV file...";
    }

    // Getters and Setters
    public String getJobId() { return jobId; }
    public void setJobId(String jobId) { this.jobId = jobId; }
    public boolean getIsCancelled() { return isCancelled; }
    public void setIsCancelled(boolean cancelled) { isCancelled = cancelled; }
    public boolean isDone() { return done; }
    public void setDone(boolean done) { this.done = done; }
    public int getProgress() { return progress; }
    public void setProgress(int progress) { this.progress = progress; }
    public int getTotal() { return total; }
    public void setTotal(int total) { this.total = total; }
    public String getResultPdfUrl() { return resultPdfUrl; }
    public void setResultPdfUrl(String resultPdfUrl) { this.resultPdfUrl = resultPdfUrl; }
    public String getError() { return error; }
    public void setError(String error) { this.error = error; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public int getPagesGenerated() { return pagesGenerated; }
    public void setPagesGenerated(int pagesGenerated) { this.pagesGenerated = pagesGenerated; }
}
