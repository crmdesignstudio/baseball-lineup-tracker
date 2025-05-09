import { useState, useEffect } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import CreateTeamModal from '../components/CreateTeamModal';
import { api, Team as TeamType } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Teams() {
  const [teams, setTeams] = useState<TeamType[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setIsLoading(true);
      const data = await api.getTeams();
      setTeams(data);
      setError(null);
    } catch (err) {
      setError('Failed to load teams. Please try again later.');
      console.error('Error loading teams:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTeam = async (name: string, description: string) => {
    try {
      const newTeam = await api.createTeam(name, description);
      setTeams([...teams, newTeam]);
      setError(null);
    } catch (err) {
      setError('Failed to create team. Please try again.');
      console.error('Error creating team:', err);
    }
  };

  return (
    <div className="h-full">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              My Teams
            </h1>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              Create Team
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="mt-8">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading teams...</p>
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center bg-white rounded-lg shadow px-5 py-12">
              <h3 className="mt-2 text-sm font-medium text-gray-900">No teams</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new team.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="btn btn-primary inline-flex items-center gap-2"
                >
                  <PlusIcon className="h-5 w-5" />
                  Create Team
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {teams.map((team) => (
                <div
                  key={team._id}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow duration-200"
                >
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900">{team.name}</h3>
                    {team.description && (
                      <p className="mt-1 text-sm text-gray-500">{team.description}</p>
                    )}
                    <div className="mt-6 flex gap-3">
                      <button 
                        onClick={() => navigate(`/teams/${team._id}`)}
                        className="btn btn-secondary text-sm flex-1"
                      >
                        Manage
                      </button>
                      <Link 
                        to={`/teams/${team._id}/games`}
                        className="btn btn-primary text-sm flex-1 text-center"
                      >
                        View Games
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateTeamModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTeam}
      />
    </div>
  );
} 