// Utility functions for DPD and amount calculations

export const calculateDPD = (allocationDate: string): number => {
  const allocation = new Date(allocationDate);
  const today = new Date();
  const diffTime = today.getTime() - allocation.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

export const calculateCurrentAmount = (
  originalAmount: number,
  allocationDate: string,
  uploadedAt: string | undefined,
  dailyRate: number
): number => {
  // If no upload date provided, default to today (meaning 0 days of additional interest)
  const uploadDate = new Date(uploadedAt || new Date().toISOString());
  const today = new Date();
  
  // Calculate days passed since upload
  const diffTime = today.getTime() - uploadDate.getTime();
  const daysSinceUpload = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  
  // Compound daily interest only for days passed AFTER upload
  const currentAmount = originalAmount * Math.pow(1 + dailyRate / 100, daysSinceUpload);
  return Math.round(currentAmount * 100) / 100;
};

export const calculateInterestAccrued = (
  originalAmount: number,
  currentAmount: number
): number => {
  return currentAmount - originalAmount;
};

export const getDPDBucket = (dpd: number): string => {
  if (dpd >= 0 && dpd <= 30) return '0-30';
  if (dpd >= 31 && dpd <= 60) return '30-60';
  if (dpd >= 61 && dpd <= 90) return '60-90';
  return '90+';
};
