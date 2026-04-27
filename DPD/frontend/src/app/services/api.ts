import axios from 'axios';
import { AllocationData } from '../types';

const API_base_URL = 'http://localhost:8000'; // Make sure this matches your FastAPI port

const api = axios.create({
    baseURL: API_base_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle token refresh on 401
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('access_token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Helper to convert Snake Case (Backend) to Camel Case (Frontend)
const toFrontend = (data: any): AllocationData => ({
    id: data.id,
    customerName: data.customer_name,
    accountNumber: data.account_number,
    amount: data.amount,
    originalAmount: data.original_amount,
    DPD: data.dpd,
    allocationDate: data.allocation_date,
    lender: data.lender,
    isPaid: data.is_paid,
    contactPhone: data.contact_phone,
    contactEmail: data.contact_email,
    address: data.address,
    uploadedAt: data.uploaded_at,
    logs: data.logs ? data.logs.map((log: any) => ({
        id: log.id,
        allocationId: log.allocation_id,
        type: log.type,
        status: log.status,
        timestamp: log.timestamp
    })) : [],
});

// Helper to convert Camel Case (Frontend) to Snake Case (Backend)
const toBackend = (data: AllocationData): any => ({
    id: data.id,
    customer_name: data.customerName,
    account_number: data.accountNumber,
    amount: data.amount,
    original_amount: data.originalAmount,
    dpd: data.DPD,
    allocation_date: data.allocationDate, // Assuming YYYY-MM-DD
    lender: data.lender,
    is_paid: data.isPaid,
    contact_phone: data.contactPhone,
    contact_email: data.contactEmail,
    address: data.address,
});

export const allocations = {
    getAll: async () => {
        const response = await api.get('/allocations/');
        return response.data.map(toFrontend);
    },

    upload: async (data: AllocationData[]) => {
        const backendData = data.map(toBackend);
        const response = await api.post('/allocations/upload', backendData);
        return response.data;
    },

    deleteAll: async () => {
        const response = await api.delete('/allocations/');
        return response.data;
    },

    update: async (id: string, data: Partial<AllocationData>) => {
        // Logic to update single alloction if needed
    }
};

export const notifications = {
    send: async (allocationId: string, type: string, attachmentUrl?: string, link?: string, campaignCode?: string) => {
        const response = await api.post('/notifications/send', {
            allocation_id: allocationId,
            type: type,
            attachment_url: attachmentUrl,
            link: link,
            campaign_code: campaignCode
        });
        return response.data;
    },

    sendBulk: async (allocationIds: string[], type: string, content: string, attachmentUrl?: string, link?: string, campaignCode?: string) => {
        const response = await api.post('/notifications/bulk-send', {
            allocation_ids: allocationIds,
            type: type,
            content: content,
            attachment_url: attachmentUrl,
            link: link,
            campaign_code: campaignCode
        });
        return response.data;
    },

    uploadFile: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/notifications/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }
}

export const auth = {
    login: async (username: string, password: string) => {
        const params = new URLSearchParams();
        params.append('username', username);
        params.append('password', password);
        
        const response = await api.post('/auth/token', params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        const { access_token } = response.data;
        localStorage.setItem('access_token', access_token);
        return response.data;
    },

    register: async (username: string, password: string, lender?: string, isHost: boolean = false) => {
        const response = await api.post('/auth/register', {
            username,
            password,
            lender,
            is_host: isHost,
        });
        return response.data;
    },

    getCurrentUser: async () => {
        const response = await api.get('/auth/users/me');
        return response.data;
    },

    logout: () => {
        localStorage.removeItem('access_token');
    },

    isAuthenticated: () => {
        return !!localStorage.getItem('access_token');
    }
};

export const recoveryRate = {
    getHistory: async (lender?: string, days: number = 30) => {
        const params = new URLSearchParams();
        if (lender) params.append('lender', lender);
        params.append('days', days.toString());
        
        const response = await api.get(`/recovery-rate/history?${params}`);
        return response.data;
    },

    getCurrent: async (lender?: string) => {
        const params = new URLSearchParams();
        if (lender) params.append('lender', lender);
        
        const response = await api.get(`/recovery-rate/current?${params}`);
        return response.data;
    },

    createSnapshot: async (lender?: string) => {
        const response = await api.post('/recovery-rate/snapshot', { lender });
        return response.data;
    },
};

export default api;
