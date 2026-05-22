import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api'
});

// Add a request interceptor to include the JWT token in all requests
api.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem('healthcare-user'));
    if (user && user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
