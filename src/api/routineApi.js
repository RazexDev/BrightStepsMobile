import api from "./axiosConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const createRoutine = async (payload, isFormData = false) => {
  try {
    const token = await AsyncStorage.getItem("token");
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    };

    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${api.defaults.baseURL}/routines`, {
      method: "POST",
      headers,
      body: isFormData ? payload : JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    console.log("=== SERVER RESPONSE after CREATE ===", JSON.stringify(data));
    return data.data || data;
  } catch (error) {
    console.log("=== FETCH ERROR ===", error.message);
    throw error;
  }
};

export const getRoutinesByStudentId = async (studentId) => {
  const response = await api.get(`/routines/student/${studentId}`);

  console.log("=== SERVER RESPONSE after GET ===", JSON.stringify(response.data));

  return response.data.data || response.data;
};

export const updateRoutine = async (id, payload, isFormData = false) => {
  const config = isFormData
    ? { headers: { "Accept": "application/json" } }
    : { headers: { "Content-Type": "application/json" } };

  const response = await api.put(`/routines/${id}`, payload, config);

  return response.data.data || response.data;
};

export const toggleRoutineStatus = async (id, isCompleted) => {
  const response = await api.put(`/routines/${id}`, { isCompleted });
  return response.data.data || response.data;
};

export const toggleTaskStatus = async (routineId, taskIndex, completed) => {
  const response = await api.patch("/routines/progress", {
    routineId,
    taskIndex,
    completed,
  });

  return response.data;
};

export const deleteRoutine = async (id) => {
  const response = await api.delete(`/routines/${id}`);
  return response.data;
};