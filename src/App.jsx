import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Home from './pages/Home'
import Teams from './pages/Teams'
import Team from './pages/Team'
import Projects from './pages/Projects'
import Profile from './pages/Profile'
import InvitePage from './pages/InvitePage'
// Admin pages
import AdminHome from './pages/admin/AdminHome'
import AdminUsers from './pages/admin/AdminUsers'
import AdminUserProfile from './pages/admin/AdminUserProfile'
import AdminCreateUser from './pages/admin/AdminCreateUser'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/teams" element={<Teams />} />
        <Route path="/teams/:teamId" element={<Team />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/invite/:code" element={<InvitePage />} />
        {/* Admin routes */}
        <Route path="/admin" element={<AdminHome />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/users/create" element={<AdminCreateUser />} />
        <Route path="/admin/users/:userId" element={<AdminUserProfile />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
