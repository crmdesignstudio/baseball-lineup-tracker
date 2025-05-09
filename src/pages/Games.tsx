import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PlusIcon, ArrowLeftIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { api } from '../services/api';
import type { Team, Game } from '../services/api';

export default function Games() {
  const { teamId } = useParams<{ teamId: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    opponent: '',
    date: '',
    time: '',
    isHome: true
  });

  useEffect(() => {
    const loadTeamAndGames = async () => {
      if (!teamId) return;
      
      try {
        setLoading(true);
        const [teams, gamesData] = await Promise.all([
          api.getTeams(),
          api.getTeamGames(teamId)
        ]);
        const teamData = teams.find(t => t._id === teamId);
        if (!teamData) {
          throw new Error('Team not found');
        }
        setTeam(teamData);
        setGames(gamesData);
        setError(null);
      } catch (err) {
        setError('Failed to load team data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadTeamAndGames();
  }, [teamId]);

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newGame = await api.createGame(
        teamId!,
        formData.opponent,
        new Date(`${formData.date}T${formData.time}`),
        formData.isHome
      );
      setGames([...games, newGame]);
      setShowModal(false);
      resetForm();
    } catch (err) {
      setError('Failed to create game');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGame) return;
    setIsSubmitting(true);
    try {
      const updatedGame = await api.updateGame(
        editingGame._id,
        formData.opponent,
        new Date(`${formData.date}T${formData.time}`),
        formData.isHome
      );
      setGames(games.map(g => g._id === updatedGame._id ? updatedGame : g));
      setShowModal(false);
      setEditingGame(null);
      resetForm();
    } catch (err) {
      setError('Failed to update game');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    if (!window.confirm('Are you sure you want to delete this game? This action cannot be undone.')) {
      return;
    }
    
    setDeleteLoading(gameId);
    try {
      await api.deleteGame(gameId);
      setGames(games.filter(g => g._id !== gameId));
    } catch (err) {
      setError('Failed to delete game');
      console.error(err);
    } finally {
      setDeleteLoading(null);
    }
  };

  const resetForm = () => {
    setFormData({
      opponent: '',
      date: '',
      time: '',
      isHome: true
    });
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="text-red-500 text-center">{error}</div>;
  if (!team) return <div className="text-center">Team not found</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Link
            to={`/teams/${teamId}`}
            className="flex items-center text-blue-500 hover:text-blue-700 mr-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-1" />
            Back to Team
          </Link>
        </div>
        <h1 className="text-3xl font-bold mb-2">{team.name} - Games</h1>
      </div>

      <div className="mb-6">
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Game
        </button>
      </div>

      <div className="grid gap-4">
        {games.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No games scheduled yet. Click "Add Game" to schedule your first game.
          </div>
        ) : (
          games.map((game) => (
            <div
              key={game._id}
              className="bg-white p-6 rounded shadow hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {game.isHome ? `${team.name} vs ${game.opponent}` : `${game.opponent} vs ${team.name}`}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {new Date(game.date).toLocaleDateString()} at {new Date(game.date).toLocaleTimeString()}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Link
                    to={`/teams/${team._id}/games/${game._id}`}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Manage Game
                  </Link>
                  <button
                    onClick={() => {
                      const gameDate = new Date(game.date);
                      setEditingGame(game);
                      setFormData({
                        opponent: game.opponent,
                        date: gameDate.toISOString().split('T')[0],
                        time: gameDate.toTimeString().slice(0, 5),
                        isHome: game.isHome
                      });
                      setShowModal(true);
                    }}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteGame(game._id)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <TrashIcon className="h-4 w-4 mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingGame ? 'Edit Game' : 'Add Game'}
            </h2>
            <form onSubmit={editingGame ? handleUpdateGame : handleCreateGame}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Opponent</label>
                  <input
                    type="text"
                    value={formData.opponent}
                    onChange={(e) => setFormData({ ...formData, opponent: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Time</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isHome}
                      onChange={(e) => setFormData({ ...formData, isHome: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      disabled={isSubmitting}
                    />
                    <span className="ml-2 text-sm text-gray-700">Home Game</span>
                  </label>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingGame(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {editingGame ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingGame ? 'Update' : 'Create'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 