import { useState } from 'react';
import { registerUser } from '../services/api';
import { useNavigate } from 'react-router-dom';

const Register = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        fullName: "",
        Number: "",
        username: "",
        email: "",
        password: "",
    });
    const [res, setResData] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: name === "Number" ? Number(value) : value,  // Convert Number field to a number
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const { data } = await registerUser(formData);
            setResData(data);
            console.log(data.message);
            if (data.message === "User registered successfully") {
                navigate('/login');
            }
        } catch (error) {
            console.error(error);
        }
    };
    // console.log(res);
    return (
        <form onSubmit={handleSubmit}>
            <h2 style={{ color: "red" }}>{res.message}</h2>
            <input
                type="text"
                name="fullName"
                placeholder="Name"
                value={formData.fullName}
                onChange={handleChange}
                required
            />
            <input
                type="text"
                name="username"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
                required
            />
            <input
                type="number"
                name="Number"
                placeholder="Number"
                value={formData.Number}
                onChange={handleChange}
                required
            />
            <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                required
            />
            <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
            />
            <button type="submit">Register</button>
            <a href='/login'> have a already account ?</a>
        </form>
    );
};

export default Register;
