import api from './axiosConfig';

export const createRoutine = async (routineData) => {
  const response = await api.post('/routines', routineData);
  console.log('=== SERVER RESPONSE after CREATE ===', JSON.stringify(response.data));
  return response.data;
};

export const getRoutinesByStudentId = async (studentId) => {
  const response = await api.get(`/routines/${studentId}`);
  console.log('=== SERVER RESPONSE after GET ===', JSON.stringify(response.data));
  // Handle case where data might be nested inside a response.data.data depending on backend setup
  return response.data.data || response.data;
};

export const toggleRoutineStatus = async (id) => {
  const response = await api.put(`/routines/${id}/toggle`);
  return response.data;
};

// Toggle a specific nested task within a routine pack
export const toggleTaskStatus = async (routineId, taskId) => {
  const response = await api.put(`/routines/${routineId}/tasks/${taskId}/toggle`);
  return response.data;
};

export const deleteRoutine = async (id) => {
  const response = await api.delete(`/routines/${id}`);
  return response.data;
};
