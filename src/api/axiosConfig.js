import axios from 'axios';

// Replace with your actual computer's local IP address (find via 'ipconfig' on Windows or 'ifconfig' on Mac)
const BASE_URL = 'http://10.54.71.107:5001/api';

export const api = axios.create({
  baseURL: BASE_URL,
});

export default api;