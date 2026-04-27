import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { Login } from './components/Login';
import { AllocationData, ClientSettings, User } from './types';
import { parseCSV, getSampleData } from './utils/dataUtils';
import { allocations as allocationService, auth } from './services/api';
import { toast, Toaster } from 'sonner';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [allocations, setAllocations] = useState<AllocationData[]>([]);
  const [clientSettings, setClientSettings] = useState<ClientSettings>({
    dailyInterestRate: 0.1, // Restore 0.1% per day since double-counting is fixed
    penaltyRate: 2.0, // Default penalty
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();

    // Listen for theme change from parent
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'THEME_CHANGE') {
        if (event.data.isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const checkAuth = async () => {
    if (auth.isAuthenticated()) {
      try {
        const userData = await auth.getCurrentUser();
        setUser(userData);
        await loadData();
      } catch (error) {
        auth.logout();
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await allocationService.getAll();
      if (data.length > 0) {
        setAllocations(data);
      } else {
        setAllocations([]);
      }
    } catch (error) {
      console.error("Failed to load allocations", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (userData: User) => {
    setUser(userData);
    await loadData();
  };

  const handleLogout = () => {
    auth.logout();
    setUser(null);
    setAllocations([]);
  };

  const handleFileUpload = async (file: File, lender: string) => {
    if (!lender) {
      return; // cancel upload if no lender provided
    }

    try {
      const text = await file.text();
      const data = parseCSV(text).map(d => ({ ...d, lender }));

      if (data.length > 0) {
        setAllocations(data); // Optimistic

        try {
          await allocationService.upload(data);
          await loadData();
          toast.success(`Successfully uploaded ${data.length} records!`);
        } catch (e) {
          console.error(e);
          toast.warning("Loaded locally, but failed to save to backend.");
        }
      } else {
        toast.error('No valid data found in CSV file');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to parse CSV file');
    }
  };

  const handleLoadSample = async () => {
    const data = getSampleData();
    setAllocations(data);
    // Do not persist sample data to backend; it is only for local preview
  };

  const handleReset = async () => {
    try {
      // Clear frontend data
      setAllocations([]);
      
      // Also clear backend data by deleting all allocations
      await allocationService.deleteAll();
      
      toast.success('All data has been cleared successfully!');
    } catch (error) {
      console.error('Failed to clear data:', error);
      // Still clear frontend data even if backend fails
      setAllocations([]);
      toast.error('Frontend data cleared, but failed to clear backend data.');
    }
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <>
      <Dashboard
        user={user}
        allocations={allocations}
        onReset={handleReset}
        clientSettings={clientSettings}
        onUpdateSettings={setClientSettings}
        onFileUpload={handleFileUpload}
        onLoadSample={handleLoadSample}
        onLogout={handleLogout}
      />
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}

export default App;