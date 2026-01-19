/**
 * Server Storage Sync Utility
 * 
 * This module provides functions to sync local storage data with the backend server.
 * It maintains a fallback to localStorage for offline functionality.
 */

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001/api';

export interface SyncConfig {
    enableServerSync?: boolean;
    serverUrl?: string;
}

let config: SyncConfig = {
    enableServerSync: true,
    serverUrl: SERVER_URL
};

// --- Configuration ---

export const setSyncConfig = (newConfig: Partial<SyncConfig>) => {
    config = { ...config, ...newConfig };
};

// --- Helper Functions ---

const makeRequest = async (method: string, endpoint: string, data?: any) => {
    try {
        const options: RequestInit = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(`${config.serverUrl}${endpoint}`, options);

        if (!response.ok) {
            throw new Error(`Server error: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.warn(`Server sync failed for ${method} ${endpoint}:`, error);
        return null;
    }
};

// --- Authentication ---

/**
 * Register a new user with the server
 */
export const registerUserWithServer = async (username: string, password: string, avatar?: string) => {
    const result = await makeRequest('POST', '/auth/register', {
        username,
        password,
        avatar: avatar || null
    });
    
    if (result && result.id) {
        return {
            id: result.id,
            username: result.username,
            avatar: result.avatar
        };
    }
    return null;
};

/**
 * Login user with the server
 */
export const loginUserWithServer = async (username: string, password: string) => {
    const result = await makeRequest('POST', '/auth/login', {
        username,
        password
    });
    
    if (result && result.id) {
        return {
            id: result.id,
            username: result.username,
            avatar: result.avatar
        };
    }
    return null;
};

// --- User Storage Sync ---

export const syncUserData = async (userId: string, data: any[]) => {
    if (!config.enableServerSync) return true;
    
    const result = await makeRequest('POST', `/users/${userId}/knowledge-bases`, data);
    return result !== null;
};

export const fetchUserData = async (userId: string) => {
    if (!config.enableServerSync) return null;
    
    return await makeRequest('GET', `/users/${userId}/knowledge-bases`);
};

// --- Assessment Results Sync ---

export const syncAssessmentResults = async (userId: string, data: any[]) => {
    if (!config.enableServerSync) return true;
    
    const result = await makeRequest('POST', `/users/${userId}/assessment-results`, data);
    return result !== null;
};

export const fetchAssessmentResults = async (userId: string) => {
    if (!config.enableServerSync) return null;
    
    return await makeRequest('GET', `/users/${userId}/assessment-results`);
};

// --- Assessment History Sync ---

export const syncAssessmentHistory = async (userId: string, data: any[]) => {
    if (!config.enableServerSync) return true;
    
    const result = await makeRequest('POST', `/users/${userId}/assessment-history`, data);
    return result !== null;
};

export const fetchAssessmentHistory = async (userId: string) => {
    if (!config.enableServerSync) return null;
    
    return await makeRequest('GET', `/users/${userId}/assessment-history`);
};

// --- AI Insights Sync ---

export const syncAiInsights = async (userId: string, data: any) => {
    if (!config.enableServerSync) return true;
    
    const result = await makeRequest('POST', `/users/${userId}/ai-insights`, data);
    return result !== null;
};

export const fetchAiInsights = async (userId: string) => {
    if (!config.enableServerSync) return null;
    
    return await makeRequest('GET', `/users/${userId}/ai-insights`);
};

// --- Model Config Sync ---

export const syncModelConfig = async (config: any) => {
    if (!config.enableServerSync) return true;
    
    const result = await makeRequest('POST', '/model-config', config);
    return result !== null;
};

export const fetchModelConfig = async () => {
    if (!config.enableServerSync) return null;
    
    return await makeRequest('GET', '/model-config');
};

// --- Prompts Config Sync ---

export const syncPromptsConfig = async (prompts: any) => {
    if (!config.enableServerSync) return true;
    
    const result = await makeRequest('POST', '/prompts-config', prompts);
    return result !== null;
};

export const fetchPromptsConfig = async () => {
    if (!config.enableServerSync) return null;
    
    return await makeRequest('GET', '/prompts-config');
};

// --- Backup & Restore ---

export const createBackup = async () => {
    if (!config.enableServerSync) return null;
    
    return await makeRequest('POST', '/backup');
};

export const restoreBackup = async (backup: any) => {
    if (!config.enableServerSync) return false;
    
    const result = await makeRequest('POST', '/restore', backup);
    return result !== null;
};

// --- Health Check ---

export const checkServerHealth = async () => {
    const result = await makeRequest('GET', '/health');
    return result !== null;
};
