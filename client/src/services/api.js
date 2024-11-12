import axios from 'axios';

// Set your API URL here
const API_URL = 'http://localhost:5000/api';
const token = localStorage.getItem('token');

export const registerUser = async (userData) => {
    return await axios.post(`${API_URL}/users/register`, userData);
};

export const loginUser = async (userData) => {
    return await axios.post(`${API_URL}/users/login`, userData);
};

export const getAllUsers = async () => {
    return await axios.get(`${API_URL}/users/get-all-users`, {
        headers: { Authorization: `Bearer ${token}` }
    });
};