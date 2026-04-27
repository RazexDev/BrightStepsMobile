import axios from 'axios';

// Replace with your actual computer's local IP address (find via 'ipconfig' on Windows or 'ifconfig' on Mac)
// - Android emulator can use http://10.0.2.2:5001/api
// - Physical phone must use PC IPv4 address like http://192.168.x.x:5001/api
const BASE_URL = 'http://10.54.71.96:5001/api';

export const api = axios.create({
  baseURL: BASE_URL,
});

export default api;