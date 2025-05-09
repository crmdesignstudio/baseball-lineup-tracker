import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function Navigation() {
  const navigate = useNavigate();
  const { email, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-primary-600">Baseball Lineup Tracker</span>
            </div>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 mr-4">{email}</span>
            <button
              onClick={handleLogout}
              className="btn btn-secondary text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
} 