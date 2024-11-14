import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Chat';
import VideoCall from './components/VideoCall';
import { useEffect } from 'react';
import { getAllUsers } from './services/api';

const PrivateRoute = ({ element }) => {
  const token = localStorage.getItem('token');
  return token ? element : <Navigate to="/login" />;
};
const PublicRoutes = ({ element }) => {
  const token = localStorage.getItem('token');
  return !token ? element : <Navigate to="/" />;
};

const App = () => {
  // useEffect(() => {
  //   (async () => {
  //     const { data } = await getAllUsers();
  //     console.log(data);
  //   })();
  // }, []);
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<PublicRoutes element={<Login />} />} />
        <Route path="/register" element={<PublicRoutes element={<Register />} />} />

        {/* Private routes */}
        <Route path="/" element={<PrivateRoute element={<Chat />} />} />
        <Route path="/video-call/:roomId" element={<PrivateRoute element={<VideoCall />} />} />
      </Routes>
    </Router>
  );
};

export default App;
