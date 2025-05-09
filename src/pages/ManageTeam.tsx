import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PlusIcon, PencilIcon, TrashIcon, ArrowLeftIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { api } from '../services/api';
import type { Team, Player } from '../services/api';

const POSITIONS = [
  'P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'
];

interface SortablePlayerProps {
  player: Player;
  onEdit: (player: Player) => void;
  onDelete: (playerId: string) => void;
  isDeleting: boolean;
}

function SortablePlayer({ player, onEdit, onDelete, isDeleting }: SortablePlayerProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: player._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white p-4 rounded shadow flex items-center justify-between ${
        isDragging ? 'shadow-lg' : ''
      }`}
    >
      <div
        className="flex-grow cursor-move"
        {...attributes}
        {...listeners}
      >
        <div className="font-semibold">
          {player.firstName} {player.lastName}
        </div>
        <div className="text-sm text-gray-600">
          Positions: {player.positions.join(', ')}
        </div>
        <div className="text-sm text-gray-600">
          Batting Order: {player.battingOrder || 'Not set'}
        </div>
      </div>
      <div className="flex space-x-2 ml-4">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            console.log('Edit button clicked for player:', player);
            onEdit(player);
          }}
          className="text-blue-500 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed p-2"
          disabled={isDeleting}
        >
          <PencilIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            console.log('Delete button clicked for player:', player._id);
            onDelete(player._id);
          }}
          className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed p-2"
          disabled={isDeleting}
        >
          {isDeleting ? (
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <TrashIcon className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}

export default function ManageTeam() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    jerseyNumber: '',
    positions: [] as string[]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadTeamAndPlayers = useCallback(async () => {
    if (!teamId) return;
    
    try {
      setLoading(true);
      const [teams, playersData] = await Promise.all([
        api.getTeams(),
        api.getTeamPlayers(teamId)
      ]);
      const teamData = teams.find(t => t._id === teamId);
      if (!teamData) {
        throw new Error('Team not found');
      }
      setTeam(teamData);
      setPlayers(playersData.sort((a: Player, b: Player) => (a.battingOrder || 0) - (b.battingOrder || 0)));
      setError(null);
    } catch (err) {
      setError('Failed to load team data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadTeamAndPlayers();
  }, [loadTeamAndPlayers]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = players.findIndex(p => p._id === active.id);
    const newIndex = players.findIndex(p => p._id === over.id);

    const newPlayers = arrayMove(players, oldIndex, newIndex);
    setPlayers(newPlayers);

    // Update batting order for all affected players
    const playerOrders = newPlayers.map((player, index) => ({
      playerId: player._id,
      battingOrder: index + 1
    }));

    try {
      const updatedPlayers = await api.updateBattingOrder(teamId!, playerOrders);
      setPlayers(updatedPlayers.sort((a: Player, b: Player) => (a.battingOrder || 0) - (b.battingOrder || 0)));
    } catch (err) {
      setError('Failed to update batting order');
      console.error('Error updating batting order:', err);
      // Revert to original order if update fails
      setPlayers(players);
    }
  }, [players, teamId]);

  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newPlayer = await api.createPlayer(
        formData.firstName,
        formData.lastName,
        parseInt(formData.jerseyNumber),
        formData.positions,
        teamId!
      );
      setPlayers([...players, newPlayer]);
      setShowModal(false);
      resetForm();
    } catch (err) {
      setError('Failed to create player');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;
    console.log('Updating player:', editingPlayer._id, formData);
    setIsSubmitting(true);
    try {
      const updatedPlayer = await api.updatePlayer(
        editingPlayer._id,
        formData.firstName,
        formData.lastName,
        parseInt(formData.jerseyNumber),
        formData.positions
      );
      console.log('Player updated successfully:', updatedPlayer);
      setPlayers(players.map(p => p._id === updatedPlayer._id ? updatedPlayer : p));
      setShowModal(false);
      setEditingPlayer(null);
      resetForm();
    } catch (err) {
      console.error('Error updating player:', err);
      setError('Failed to update player');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    console.log('Attempting to delete player:', playerId);
    if (!window.confirm('Are you sure you want to delete this player? This action cannot be undone.')) {
      console.log('Delete cancelled by user');
      return;
    }
    
    setDeleteLoading(playerId);
    try {
      console.log('Sending delete request for player:', playerId);
      await api.deletePlayer(playerId);
      console.log('Player deleted successfully');
      setPlayers(players.filter(p => p._id !== playerId));
    } catch (err) {
      console.error('Error deleting player:', err);
      setError('Failed to delete player');
    } finally {
      setDeleteLoading(null);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      jerseyNumber: '',
      positions: []
    });
  };

  const handlePositionChange = (position: string) => {
    setFormData(prev => ({
      ...prev,
      positions: prev.positions.includes(position)
        ? prev.positions.filter(p => p !== position)
        : [...prev.positions, position]
    }));
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="text-red-500 text-center">{error}</div>;
  if (!team) return <div className="text-center">Team not found</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Link
            to="/"
            className="flex items-center text-blue-500 hover:text-blue-700 mr-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-1" />
            Back to Teams
          </Link>
          <Link
            to={`/teams/${teamId}/games`}
            className="flex items-center text-blue-500 hover:text-blue-700"
          >
            <CalendarIcon className="h-5 w-5 mr-1" />
            View Games
          </Link>
        </div>
        <h1 className="text-3xl font-bold mb-2">{team.name}</h1>
        <p className="text-gray-600">{team.description}</p>
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
          Add Player
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={players.map(p => p._id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {players.map((player) => (
              <SortablePlayer
                key={player._id}
                player={player}
                onEdit={(player) => {
                  console.log('Edit button clicked for player:', player);
                  setEditingPlayer(player);
                  setFormData({
                    firstName: player.firstName,
                    lastName: player.lastName,
                    jerseyNumber: player.jerseyNumber.toString(),
                    positions: player.positions
                  });
                  setShowModal(true);
                }}
                onDelete={(playerId) => {
                  console.log('Delete button clicked for player:', playerId);
                  handleDeletePlayer(playerId);
                }}
                isDeleting={deleteLoading === player._id}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingPlayer ? 'Edit Player' : 'Add Player'}
            </h2>
            <form onSubmit={editingPlayer ? handleUpdatePlayer : handleCreatePlayer}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Jersey Number</label>
                  <input
                    type="number"
                    value={formData.jerseyNumber}
                    onChange={(e) => setFormData({ ...formData, jerseyNumber: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                    min="0"
                    max="99"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Positions</label>
                  <div className="grid grid-cols-5 gap-2">
                    {POSITIONS.map((position) => (
                      <button
                        key={position}
                        type="button"
                        onClick={() => handlePositionChange(position)}
                        disabled={isSubmitting}
                        className={`px-3 py-1 rounded ${
                          formData.positions.includes(position)
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700'
                        } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {position}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingPlayer(null);
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
                      {editingPlayer ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingPlayer ? 'Update' : 'Create'
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