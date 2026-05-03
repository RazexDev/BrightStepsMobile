import api from './axiosConfig';
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "http://10.54.71.107:5001/api";

export const getProgressReports = async () => {
  const response = await api.get('/progress');
  return response.data;
};

export const getProgressReportById = async (id) => {
  const response = await api.get(`/progress/${id}`);
  return response.data;
};

export const createProgressReport = async (reportData, isFormData = false) => {
  if (isFormData) {
    const token = await AsyncStorage.getItem("token");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch(`${BASE_URL}/progress`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json"
        },
        body: reportData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[progressApi] Server error:', errorText);
        throw new Error(errorText || 'Failed to create report');
      }
      return await response.json();
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('[progressApi] fetch error:', err.message);
      throw err;
    }
  }
  const response = await api.post('/progress', reportData);
  return response.data;
};

export const updateProgressReport = async (id, reportData) => {
  const response = await api.put(`/progress/${id}`, reportData);
  return response.data;
};

export const deleteProgressReport = async (id) => {
  const response = await api.delete(`/progress/${id}`);
  return response.data;
};

// Fetch game telemetry records for a specific child (by their user _id)
// Used by parent portal to show per-game stars and play time
export const getGameTelemetryByChild = async (childId) => {
  const response = await api.get(`/progress/${childId}`);
  return response.data;
};
