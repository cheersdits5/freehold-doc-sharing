// Login page component
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginForm } from '../components/LoginForm';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLoginSuccess = () => {
    // Redirect to the page they were trying to access, or dashboard by default
    const from = location.state?.from?.pathname || '/dashboard';
    navigate(from, { replace: true });
  };

  return <LoginForm onSuccess={handleLoginSuccess} />;
}