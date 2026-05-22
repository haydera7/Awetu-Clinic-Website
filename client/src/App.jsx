import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { DataProvider } from './contexts/DataContext';
import { ThemeProvider } from './contexts/ThemeContext';
import LandingPage from './pages/LandingPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardOverview from './pages/dashboard/Overview';
import PatientsList from './pages/dashboard/PatientsList';
import PatientDetails from './pages/dashboard/PatientDetails';
import VisitsList from './pages/dashboard/VisitsList';
import MedicalRecords from './pages/dashboard/MedicalRecords';
import StaffList from './pages/dashboard/StaffList';
import Settings from './pages/dashboard/Settings';
import PharmacyBilling from './pages/dashboard/PharmacyBilling';
import Analytics from './pages/dashboard/Analytics';
import Appointments from './pages/dashboard/Appointments';
import MyProfile from './pages/dashboard/MyProfile';
import PaymentVerify from './pages/dashboard/PaymentVerify';
import Announcements from './pages/dashboard/Announcements';

function App() {
  return (
    <GoogleOAuthProvider clientId="1034853029881-0g4l6um2avfjvn6ljn40ejnmueoon063.apps.googleusercontent.com">
      <Router>
        <ThemeProvider>
          <AuthProvider>
            <SocketProvider>
              <DataProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<Navigate to="/dashboard/overview" replace />} />
                <Route path="overview" element={<DashboardOverview />} />
                <Route path="patients" element={<PatientsList />} />
                <Route path="patient/:id" element={<PatientDetails />} />
                <Route path="visits" element={<VisitsList />} />
                <Route path="records" element={<MedicalRecords />} />
                <Route path="appointments" element={<Appointments />} />
                <Route path="staff" element={<StaffList />} />
                <Route path="pharmacy" element={<PharmacyBilling />} />
                <Route path="billing/verify" element={<PaymentVerify />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="announcements" element={<Announcements />} />
                <Route path="settings" element={<Settings />} />
                <Route path="profile" element={<MyProfile />} />
              </Route>
            </Routes>
          </DataProvider>
        </SocketProvider>
        </AuthProvider>
        </ThemeProvider>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
