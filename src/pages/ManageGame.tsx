import { useState, useEffect, Fragment, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
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
import { api } from '../services/api';
import type { Team, Game, Player } from '../services/api';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];

interface SortablePlayerProps {
  player: Player;
  index: number;
  inningsCount: number;
  onRemove: (playerId: string) => void;
}

function SortablePlayer({ player, index, inningsCount, onRemove }: SortablePlayerProps) {
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
      className={`flex items-center justify-between p-2 rounded ${
        isDragging ? 'bg-blue-50 shadow-lg' : 'bg-gray-50'
      }`}
    >
      <div
        className="flex-grow cursor-move"
        {...attributes}
        {...listeners}
      >
        <div className="flex items-center">
          <span className="font-medium mr-2">{index + 1}.</span>
          <span className="font-medium">
            {player.firstName} {player.lastName}
          </span>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-500">
          {inningsCount} innings
        </span>
        <button
          onClick={() => onRemove(player._id)}
          className="text-red-500 hover:text-red-700"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

interface SortablePitcherProps {
  player: Player;
  index: number;
  onRemove: (playerId: string) => void;
}

function SortablePitcher({ player, index, onRemove }: SortablePitcherProps) {
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
      className={`flex items-center justify-between p-2 rounded ${
        isDragging ? 'bg-blue-50 shadow-lg' : 'bg-gray-50'
      }`}
    >
      <div
        className="flex-grow cursor-move"
        {...attributes}
        {...listeners}
      >
        <div className="flex items-center">
          <span className="font-medium mr-2">{index + 1}.</span>
          <span className="font-medium">
            {player.firstName} {player.lastName}
          </span>
        </div>
      </div>
      <button
        onClick={() => onRemove(player._id)}
        className="text-red-500 hover:text-red-700 ml-4"
      >
        Remove
      </button>
    </div>
  );
}

// Helper function to get available players for a position
function getAvailablePlayersForPosition(
  players: Player[],
  currentLineup: Record<string, Player | null>,
  position: string,
  battingOrder: Player[]
): Player[] {
  // Return all players from the batting order who can play this position
  return battingOrder.filter(p => p.positions.includes(position));
}

// Helper function to get pitcher assignments for each inning
function getPitcherAssignments(
  pitcherOrder: Player[], 
  availablePlayerIds: string[], 
  totalInnings: number = 6
): Player[] {
  // Only use pitchers that are in the numbered pitcher order and available for the game
  const activePitchers = pitcherOrder.filter(p => availablePlayerIds.includes(p._id));
  
  console.log('Active pitchers for assignment:', activePitchers.map(p => `${p.firstName} ${p.lastName}`));
  
  if (activePitchers.length === 0) {
    console.log('No active pitchers found');
    return Array(totalInnings).fill(null);
  }
  
  const assignments: Player[] = Array(totalInnings).fill(null);
  
  if (activePitchers.length <= 3) {
    // For 3 or fewer pitchers, split innings evenly with consecutive innings
    const inningsPerPitcher = Math.floor(totalInnings / activePitchers.length);
    console.log(`Assigning ${inningsPerPitcher} innings per pitcher for ${activePitchers.length} pitchers`);
    
    // Assign consecutive innings to each pitcher in order
    activePitchers.forEach((pitcher, index) => {
      const startInning = index * inningsPerPitcher;
      console.log(`Assigning ${pitcher.firstName} to innings ${startInning + 1}-${startInning + inningsPerPitcher}`);
      
      // Assign consecutive innings to this pitcher
      for (let i = 0; i < inningsPerPitcher; i++) {
        assignments[startInning + i] = pitcher;
      }
    });
  } else {
    // For more than 3 pitchers:
    // - First 2 pitchers get 2 innings each (consecutive)
    // - Remaining pitchers get 1 inning each
    console.log('More than 3 pitchers - assigning 2 innings to first 2, 1 inning to rest');
    
    // First pitcher gets innings 1-2
    assignments[0] = activePitchers[0];
    assignments[1] = activePitchers[0];
    console.log(`Assigning ${activePitchers[0].firstName} to innings 1-2`);
    
    // Second pitcher gets innings 3-4
    assignments[2] = activePitchers[1];
    assignments[3] = activePitchers[1];
    console.log(`Assigning ${activePitchers[1].firstName} to innings 3-4`);
    
    // Remaining pitchers get 1 inning each
    for (let i = 2; i < activePitchers.length; i++) {
      if (i + 2 < totalInnings) {
        assignments[i + 2] = activePitchers[i];
        console.log(`Assigning ${activePitchers[i].firstName} to inning ${i + 3}`);
      }
    }
  }
  
  console.log('Final pitcher assignments:', assignments.map((p, i) => 
    p ? `Inning ${i + 1}: ${p.firstName} ${p.lastName}` : `Inning ${i + 1}: None`
  ));
  
  return assignments;
}

// Helper function to shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Helper function to generate positions for all innings
function generateAllPositions(
  players: Player[],
  pitcherOrder: Player[],
  battingOrder: Player[],
  availablePlayerIds: string[],
  availablePitchersList: Player[]
): { inning: number; positions: Record<string, Player | null> }[] {
  const lineups = [];
  const playerInningCounts = new Map<string, number>();
  const playerLastInning = new Map<string, number>();

  // Initialize counts
  battingOrder.forEach(player => {
    playerInningCounts.set(player._id, 0);
    playerLastInning.set(player._id, -1);
  });

  // Get pitcher assignments for all innings
  const pitcherAssignments = getPitcherAssignments(pitcherOrder, availablePlayerIds);

  // Generate positions for each inning
  for (let inning = 1; inning <= 6; inning++) {
    const positions: Record<string, Player | null> = {};
    const availablePlayers = [...battingOrder];
    const assignedPlayerIds = new Set<string>();

    // First, assign the pitcher for this inning
    const pitcher = pitcherAssignments[inning - 1];
    if (pitcher) {
      positions['P'] = pitcher;
      assignedPlayerIds.add(pitcher._id);
      availablePlayers.splice(availablePlayers.findIndex(p => p._id === pitcher._id), 1);
    }

    // Define position priority order (excluding pitcher which is already assigned)
    const positionPriority = ['C', 'SS', '2B', '3B', '1B', 'LF', 'CF', 'RF'];
    
    // Shuffle the position priority to introduce variation
    const shuffledPriority = shuffleArray([...positionPriority]);

    // Assign remaining positions based on priority and player preferences
    for (const position of shuffledPriority) {
      // Find players who can play this position and aren't assigned yet
      const candidates = availablePlayers
        .filter(p => p.positions.includes(position) && !assignedPlayerIds.has(p._id))
        .sort((a, b) => {
          // Sort by position preference (earlier in positions array = higher preference)
          const aIndex = a.positions.indexOf(position);
          const bIndex = b.positions.indexOf(position);
          return aIndex - bIndex;
        });

      if (candidates.length > 0) {
        // Group candidates by preference level
        const preferenceGroups = new Map<number, Player[]>();
        candidates.forEach(player => {
          const prefIndex = player.positions.indexOf(position);
          if (!preferenceGroups.has(prefIndex)) {
            preferenceGroups.set(prefIndex, []);
          }
          preferenceGroups.get(prefIndex)!.push(player);
        });

        // Get the highest preference level
        const highestPref = Math.min(...preferenceGroups.keys());
        const bestCandidates = preferenceGroups.get(highestPref)!;
        
        // Randomly select from the best candidates
        const selectedPlayer = bestCandidates[Math.floor(Math.random() * bestCandidates.length)];
        
        positions[position] = selectedPlayer;
        assignedPlayerIds.add(selectedPlayer._id);
        availablePlayers.splice(availablePlayers.findIndex(p => p._id === selectedPlayer._id), 1);
      } else {
        // If no preferred players available, find any available player
        const anyPlayer = availablePlayers.find(p => !assignedPlayerIds.has(p._id));
        if (anyPlayer) {
          positions[position] = anyPlayer;
          assignedPlayerIds.add(anyPlayer._id);
          availablePlayers.splice(availablePlayers.findIndex(p => p._id === anyPlayer._id), 1);
        } else {
          positions[position] = null;
        }
      }
    }

    // Update player counts and last inning played
    Object.entries(positions).forEach(([_, player]) => {
      if (player) {
        playerInningCounts.set(player._id, (playerInningCounts.get(player._id) || 0) + 1);
        playerLastInning.set(player._id, inning);
      }
    });

    lineups.push({
      inning,
      positions
    });
  }

  return lineups;
}

// Helper function to generate positions for a single inning
function generatePositionsForInning(
  players: Player[],
  pitcherOrder: Player[],
  inning: number,
  battingOrder: Player[],
  availablePlayerIds: string[],
  availablePitchersList: Player[]
): Record<string, Player | null> {
  const positions: Record<string, Player | null> = {};
  const availablePlayers = [...battingOrder];
  const assignedPlayerIds = new Set<string>();

  // Get pitcher assignments for all innings
  const pitcherAssignments = getPitcherAssignments(pitcherOrder, availablePlayerIds);
  
  // First, assign the pitcher for this inning
  const pitcher = pitcherAssignments[inning - 1];
  if (pitcher) {
    positions['P'] = pitcher;
    assignedPlayerIds.add(pitcher._id);
    availablePlayers.splice(availablePlayers.findIndex(p => p._id === pitcher._id), 1);
  }

  // Define position priority order (excluding pitcher which is already assigned)
  const positionPriority = ['C', 'SS', '2B', '3B', '1B', 'LF', 'CF', 'RF'];
  
  // Shuffle the position priority to introduce variation
  const shuffledPriority = shuffleArray([...positionPriority]);

  // Assign remaining positions based on priority and player preferences
  for (const position of shuffledPriority) {
    // Find players who can play this position and aren't assigned yet
    const candidates = availablePlayers
      .filter(p => p.positions.includes(position) && !assignedPlayerIds.has(p._id))
      .sort((a, b) => {
        // Sort by position preference (earlier in positions array = higher preference)
        const aIndex = a.positions.indexOf(position);
        const bIndex = b.positions.indexOf(position);
        return aIndex - bIndex;
      });

    if (candidates.length > 0) {
      // Group candidates by preference level
      const preferenceGroups = new Map<number, Player[]>();
      candidates.forEach(player => {
        const prefIndex = player.positions.indexOf(position);
        if (!preferenceGroups.has(prefIndex)) {
          preferenceGroups.set(prefIndex, []);
        }
        preferenceGroups.get(prefIndex)!.push(player);
      });

      // Get the highest preference level
      const highestPref = Math.min(...preferenceGroups.keys());
      const bestCandidates = preferenceGroups.get(highestPref)!;
      
      // Randomly select from the best candidates
      const selectedPlayer = bestCandidates[Math.floor(Math.random() * bestCandidates.length)];
      
      positions[position] = selectedPlayer;
      assignedPlayerIds.add(selectedPlayer._id);
      availablePlayers.splice(availablePlayers.findIndex(p => p._id === selectedPlayer._id), 1);
    } else {
      // If no preferred players available, find any available player
      const anyPlayer = availablePlayers.find(p => !assignedPlayerIds.has(p._id));
      if (anyPlayer) {
        positions[position] = anyPlayer;
        assignedPlayerIds.add(anyPlayer._id);
        availablePlayers.splice(availablePlayers.findIndex(p => p._id === anyPlayer._id), 1);
      } else {
        positions[position] = null;
      }
    }
  }

  return positions;
}

export default function ManageGame() {
  const { gameId } = useParams<{ gameId: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [battingOrder, setBattingOrder] = useState<Player[]>([]);
  const [pitcherOrder, setPitcherOrder] = useState<Player[]>([]);
  const [availablePitchers, setAvailablePitchers] = useState<Player[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<string[]>([]);
  const [lineups, setLineups] = useState<{ inning: number; positions: Record<string, Player | null> }[]>([]);
  const [currentInning, setCurrentInning] = useState<number | null>(null);
  const [showLineupCard, setShowLineupCard] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const loadGameData = async () => {
      if (!gameId) return;
      
      try {
        setLoading(true);
        const gameData = await api.getGame(gameId);
        setGame(gameData);
        
        const teamData = await api.getTeam(gameData.team);
        setTeam(teamData);
        
        const playersData = await api.getTeamPlayers(gameData.team);
        setPlayers(playersData);
        
        // Initialize available players with all players if not already set
        if (!gameData.availablePlayers || gameData.availablePlayers.length === 0) {
          const allPlayerIds = playersData.map(p => p._id);
          setAvailablePlayers(allPlayerIds);
          // Save all players as available to backend
          await api.updateGame(gameId, {
            availablePlayers: allPlayerIds
          });
        } else {
          setAvailablePlayers(gameData.availablePlayers);
        }
        
        // Initialize batting order with players who have a batting order set and are available
        const initialBattingOrder = playersData
          .filter(p => p.battingOrder && gameData.availablePlayers?.includes(p._id))
          .sort((a, b) => (a.battingOrder || 0) - (b.battingOrder || 0));

        // If no batting order exists in the game, use the team's default batting order
        if (initialBattingOrder.length === 0) {
          const defaultBattingOrder = playersData
            .filter(p => p.battingOrder)
            .sort((a, b) => (a.battingOrder || 0) - (b.battingOrder || 0));
          setBattingOrder(defaultBattingOrder);
        } else {
          setBattingOrder(initialBattingOrder);
        }
        
        // Initialize available pitchers (players who can play P position and are available)
        const pitchers = playersData.filter(p => 
          p.positions.includes('P') && gameData.availablePlayers?.includes(p._id)
        );
        setAvailablePitchers(pitchers);
        
        // Initialize pitcher order from game data if it exists
        if (gameData.pitcherOrder) {
          const orderedPitchers = gameData.pitcherOrder
            .map(id => pitchers.find(p => p._id === id))
            .filter((p): p is Player => p !== undefined);
          setPitcherOrder(orderedPitchers);
        }
        
        // Initialize lineups for 6 innings
        const defaultLineup = Object.fromEntries(POSITIONS.map(pos => [pos, null]));
        const initialLineups = Array.from({ length: 6 }, (_, i) => {
          const inning = i + 1;
          const existingLineup = gameData.lineups?.find(l => l.inning === inning);
          
          if (existingLineup) {
            return {
              inning,
              positions: Object.fromEntries(
                existingLineup.positions.map(pos => [
                  pos.position,
                  pos.playerId ? playersData.find(p => p._id === pos.playerId) || null : null
                ])
              )
            };
          }
          
          return {
            inning,
            positions: { ...defaultLineup }
          };
        });
        
        setLineups(initialLineups);
        setError(null);
      } catch (err) {
        setError('Failed to load game data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadGameData();
  }, [gameId]);

  // Update available pitchers whenever available players changes
  useEffect(() => {
    const pitchers = players.filter(p => 
      p.positions.includes('P') && availablePlayers.includes(p._id)
    );
    setAvailablePitchers(pitchers);
  }, [players, availablePlayers]);

  // Debug log for lineups state changes
  useEffect(() => {
    console.log('Current lineups:', lineups);
  }, [lineups]);

  const handleBattingOrderChange = async (newOrder: Player[]) => {
    try {
      const playerOrders = newOrder.map((player, index) => ({
        playerId: player._id,
        battingOrder: index + 1
      }));
      
      // Update state first for immediate UI feedback
      setBattingOrder(newOrder);
      
      // Then persist to backend
      await api.updateBattingOrder(team!._id, playerOrders);
    } catch (err) {
      setError('Failed to update batting order');
      console.error(err);
      // Revert state if save fails
      setBattingOrder(battingOrder);
    }
  };

  const handlePositionAssignment = async (position: string, player: Player | null) => {
    try {
      console.log('Handling position assignment:', { position, player });
      
      // If a player is being assigned, check if they're already assigned to another position
      if (player && currentLineup) {
        const currentPositions = currentLineup.positions;
        // Find any position where this player is currently assigned
        const currentPosition = Object.entries(currentPositions).find(
          ([pos, assignedPlayer]) => assignedPlayer?._id === player._id
        );
        
        // If player is already assigned to another position, remove them from that position
        if (currentPosition) {
          const [oldPosition] = currentPosition;
          console.log(`Removing ${player.firstName} from ${oldPosition}`);
          currentPositions[oldPosition] = null;
        }
      }
      
      // Create a new lineups array with the updated positions
      const updatedLineups = lineups.map(lineup => 
        lineup.inning === currentInning
          ? { ...lineup, positions: { ...lineup.positions, [position]: player } }
          : lineup
      );
      
      console.log('New lineups state:', updatedLineups);
      
      // Update state and save to backend immediately
      setLineups(updatedLineups);
      await saveLineups(updatedLineups);
      
    } catch (err) {
      console.error('Failed to assign position:', err);
      setError('Failed to assign position');
    }
  };

  const handleGenerateAllPositions = async () => {
    try {
      const newLineups = generateAllPositions(
        players,
        pitcherOrder,
        battingOrder,
        availablePlayers,
        availablePitchers
      );
      
      // Update state and save to backend immediately
      setLineups(newLineups);
      await saveLineups(newLineups);
    } catch (err) {
      setError('Failed to generate positions');
      console.error(err);
    }
  };

  const handleGenerateCurrentInning = async () => {
    try {
      if (currentInning === null) {
        console.log('No current inning selected');
        return;
      }

      // Generate new positions for the current inning
      const newPositions = generatePositionsForInning(
        players,
        pitcherOrder,
        currentInning,
        battingOrder,
        availablePlayers,
        availablePitchers
      );
      
      // Create a new lineups array with the updated positions
      const newLineups = lineups.map(lineup => {
        if (lineup.inning === currentInning) {
          return {
            ...lineup,
            positions: newPositions
          };
        }
        return lineup;
      });
      
      // Update state and save to backend immediately
      setLineups(newLineups);
      await saveLineups(newLineups);
      
    } catch (err) {
      console.error('Failed to generate positions:', err);
      setError('Failed to generate positions');
    }
  };

  // Get the current lineup for the modal
  const currentLineup = useMemo(() => {
    const lineup = lineups.find(l => l.inning === currentInning);
    console.log('Current lineup memo calculation:', {
      inning: currentInning,
      lineup
    });
    return lineup;
  }, [lineups, currentInning]);

  // Get available players for each position
  const availablePlayersByPosition = useMemo(() => {
    console.log('=== Calculating Available Players ===');
    console.log('Current lineup:', currentLineup);
    console.log('Batting order:', battingOrder.map(p => `${p.firstName} ${p.lastName}`));
    
    if (!currentLineup || !battingOrder.length) {
      console.log('No current lineup or batting order found');
      return {};
    }
    
    // Get all available players for the game
    const allAvailablePlayers = battingOrder.filter(p => availablePlayers.includes(p._id));
    
    // For each position, return all available players
    const result = POSITIONS.reduce((acc, position) => {
      acc[position] = allAvailablePlayers;
      return acc;
    }, {} as Record<string, Player[]>);

    console.log('Final available players by position:', result);
    console.log('=== Available Players Calculation Complete ===');
    return result;
  }, [currentLineup, battingOrder, players, availablePlayers]);

  useEffect(() => {
    console.log('Players loaded:', players);
    console.log('Current lineup:', currentLineup);
    console.log('Available players by position:', availablePlayersByPosition);
  }, [players, currentLineup, availablePlayersByPosition]);

  const saveLineups = async (lineupsToSave: typeof lineups) => {
    try {
      await api.updateGame(gameId!, {
        lineups: lineupsToSave.map(lineup => ({
          inning: lineup.inning,
          positions: Object.entries(lineup.positions).map(([position, player]) => ({
            position,
            playerId: player?._id || null
          }))
        }))
      });
    } catch (err) {
      console.error('Failed to save lineups:', err);
      throw err;
    }
  };

  const getPlayerInningsCount = (playerId: string) => {
    return lineups.reduce((count, lineup) => {
      const isAssigned = Object.values(lineup.positions).some(
        position => position?._id === playerId
      );
      return count + (isAssigned ? 1 : 0);
    }, 0);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = battingOrder.findIndex(p => p._id === active.id);
    const newIndex = battingOrder.findIndex(p => p._id === over.id);

    const newOrder = arrayMove(battingOrder, oldIndex, newIndex);
    
    // Update state first for immediate UI feedback
    setBattingOrder(newOrder);

    try {
      await handleBattingOrderChange(newOrder);
    } catch (err) {
      console.error('Failed to update batting order:', err);
      // Revert to original order if update fails
      setBattingOrder(battingOrder);
    }
  };

  const handlePitcherOrderChange = async (newOrder: Player[]) => {
    try {
      // Update state first for immediate UI feedback
      setPitcherOrder(newOrder);
      
      // Then persist to backend
      await api.updateGame(gameId!, {
        pitcherOrder: newOrder.map(p => p._id)
      });
    } catch (err) {
      setError('Failed to update pitcher order');
      console.error(err);
      // Revert state if save fails
      setPitcherOrder(pitcherOrder);
    }
  };

  const handlePitcherDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = pitcherOrder.findIndex(p => p._id === active.id);
    const newIndex = pitcherOrder.findIndex(p => p._id === over.id);

    const newOrder = arrayMove(pitcherOrder, oldIndex, newIndex);
    
    // Update state first for immediate UI feedback
    setPitcherOrder(newOrder);

    try {
      await handlePitcherOrderChange(newOrder);
    } catch (err) {
      console.error('Failed to update pitcher order:', err);
      // Revert to original order if update fails
      setPitcherOrder(pitcherOrder);
    }
  };

  const addPitcherToOrder = async (player: Player) => {
    if (!pitcherOrder.some(p => p._id === player._id)) {
      const newOrder = [...pitcherOrder, player];
      await handlePitcherOrderChange(newOrder);
    }
  };

  const removePitcherFromOrder = async (playerId: string) => {
    const newOrder = pitcherOrder.filter(p => p._id !== playerId);
    await handlePitcherOrderChange(newOrder);
  };

  const removePlayerFromBattingOrder = async (playerId: string) => {
    const playerToRemove = battingOrder.find(p => p._id === playerId);
    if (!playerToRemove) return;

    // Remove from batting order
    const newOrder = battingOrder.filter(p => p._id !== playerId);
    await handleBattingOrderChange(newOrder);

    // Make player unavailable
    await handleMakePlayerUnavailable(playerId);
  };

  const addPlayerToBattingOrder = async (player: Player) => {
    if (!battingOrder.some(p => p._id === player._id)) {
      const newOrder = [...battingOrder, player];
      await handleBattingOrderChange(newOrder);
    }
  };

  const handleMakePlayerUnavailable = async (playerId: string) => {
    try {
      const newAvailablePlayers = availablePlayers.filter(id => id !== playerId);
      setAvailablePlayers(newAvailablePlayers);
      
      // Remove player from batting order if they're in it
      if (battingOrder.some(p => p._id === playerId)) {
        const newOrder = battingOrder.filter(p => p._id !== playerId);
        await handleBattingOrderChange(newOrder);
      }
      
      // Remove player from pitcher order if they're in it
      if (pitcherOrder.some(p => p._id === playerId)) {
        const newOrder = pitcherOrder.filter(p => p._id !== playerId);
        await handlePitcherOrderChange(newOrder);
      }
      
      // Remove player from all lineups
      const newLineups = lineups.map(lineup => ({
        ...lineup,
        positions: Object.fromEntries(
          Object.entries(lineup.positions).map(([pos, player]) => [
            pos,
            player?._id === playerId ? null : player
          ])
        )
      }));
      setLineups(newLineups);
      await saveLineups(newLineups);
      
      // Save to backend
      await api.updateGame(gameId!, {
        availablePlayers: newAvailablePlayers
      });
    } catch (err) {
      console.error('Failed to make player unavailable:', err);
      setError('Failed to make player unavailable');
    }
  };

  const handleMakePlayerAvailable = async (playerId: string) => {
    try {
      const newAvailablePlayers = [...availablePlayers, playerId];
      setAvailablePlayers(newAvailablePlayers);
      
      // Save to backend
      await api.updateGame(gameId!, {
        availablePlayers: newAvailablePlayers
      });

      // Add player to batting order
      const player = players.find(p => p._id === playerId);
      if (player) {
        await addPlayerToBattingOrder(player);
      }
    } catch (err) {
      console.error('Failed to make player available:', err);
      setError('Failed to make player available');
    }
  };

  // Update the available players section in the UI
  const availablePlayersList = players.filter(p => availablePlayers.includes(p._id));
  const unavailablePlayersList = players.filter(p => !availablePlayers.includes(p._id));

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="text-red-500 text-center">{error}</div>;
  if (!game || !team) return <div className="text-center">Game not found</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Link
            to={`/teams/${team._id}/games`}
            className="flex items-center text-blue-500 hover:text-blue-700 mr-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-1" />
            Back to Games
          </Link>
        </div>
        <h1 className="text-3xl font-bold mb-2">
          {team.name} vs {game.opponent}
        </h1>
        <p className="text-gray-600">
          {new Date(game.date).toLocaleDateString()} at {new Date(game.date).toLocaleTimeString()}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Batting Order Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Batting Order</h2>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={battingOrder.map(p => p._id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 mb-4">
                {battingOrder.map((player, index) => (
                  <SortablePlayer
                    key={player._id}
                    player={player}
                    index={index}
                    inningsCount={getPlayerInningsCount(player._id)}
                    onRemove={removePlayerFromBattingOrder}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {unavailablePlayersList.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Unavailable Players</h3>
              <div className="space-y-2">
                {unavailablePlayersList.map(player => (
                  <div
                    key={player._id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div className="flex items-center">
                      <span className="font-medium">
                        {player.firstName} {player.lastName}
                      </span>
                    </div>
                    <button
                      onClick={() => handleMakePlayerAvailable(player._id)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      Make Available
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pitcher Order Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Pitcher Order</h2>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handlePitcherDragEnd}
          >
            <SortableContext
              items={pitcherOrder.map(p => p._id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 mb-4">
                {pitcherOrder.map((player, index) => (
                  <SortablePitcher
                    key={player._id}
                    player={player}
                    index={index}
                    onRemove={removePitcherFromOrder}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Available Pitchers</h3>
            <div className="space-y-2">
              {availablePitchers
                .filter(p => !pitcherOrder.some(ordered => ordered._id === p._id))
                .map(player => (
                  <div
                    key={player._id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div className="flex items-center">
                      <span className="font-medium">
                        {player.firstName} {player.lastName}
                      </span>
                    </div>
                    <button
                      onClick={() => addPitcherToOrder(player)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      Add to Order
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Lineup Section */}
        <div className="bg-white p-6 rounded-lg shadow md:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Lineup</h2>
            <div className="space-x-2">
              <button
                onClick={() => setShowLineupCard(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                View Lineup Card
              </button>
              <button
                onClick={handleGenerateAllPositions}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Generate All Innings
              </button>
            </div>
          </div>

          {/* Lineup Card Modal */}
          <Transition.Root show={showLineupCard} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={setShowLineupCard}>
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
              </Transition.Child>

              <div className="fixed inset-0 z-10 overflow-y-auto">
                <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                    enterTo="opacity-100 translate-y-0 sm:scale-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                    leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                  >
                    <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:p-6">
                      <div className="absolute right-0 top-0 pr-4 pt-4">
                        <button
                          type="button"
                          className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                          onClick={() => setShowLineupCard(false)}
                        >
                          <span className="sr-only">Close</span>
                          <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                        </button>
                      </div>
                      <div className="sm:flex sm:items-start">
                        <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                          <Dialog.Title as="h3" className="text-xl font-semibold leading-6 text-gray-900 mb-4">
                            Lineup Card
                          </Dialog.Title>
                          <div className="flex justify-end mb-4">
                            <button
                              onClick={() => {
                                const printWindow = window.open('', '_blank');
                                if (printWindow) {
                                  printWindow.document.write(`
                                    <html>
                                      <head>
                                        <title>Lineup Card - ${team?.name} vs ${game?.opponent}</title>
                                        <style>
                                          body { font-family: Arial, sans-serif; }
                                          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                                          th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
                                          th { background-color: #f5f5f5; }
                                          .player-name { text-align: left; }
                                          @media print {
                                            body { padding: 20px; }
                                            .header { text-align: center; margin-bottom: 20px; }
                                          }
                                        </style>
                                      </head>
                                      <body>
                                        <div class="header">
                                          <h1>${team?.name} vs ${game?.opponent}</h1>
                                          <p>${new Date(game?.date || '').toLocaleDateString()}</p>
                                        </div>
                                        <table>
                                          <thead>
                                            <tr>
                                              <th>Player</th>
                                              ${Array.from({ length: 6 }, (_, i) => `
                                                <th>Inning ${i + 1}</th>
                                              `).join('')}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            ${battingOrder.map(player => `
                                              <tr>
                                                <td class="player-name">${player.firstName} ${player.lastName}</td>
                                                ${Array.from({ length: 6 }, (_, i) => {
                                                  const inning = i + 1;
                                                  const lineup = lineups.find(l => l.inning === inning);
                                                  const position = lineup ? Object.entries(lineup.positions).find(
                                                    ([_, p]) => p?._id === player._id
                                                  )?.[0] : null;
                                                  return `<td>${position || '-'}</td>`;
                                                }).join('')}
                                              </tr>
                                            `).join('')}
                                          </tbody>
                                        </table>
                                      </body>
                                    </html>
                                  `);
                                  printWindow.document.close();
                                  printWindow.print();
                                }
                              }}
                              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                              Print Lineup
                            </button>
                          </div>
                          <div className="mt-2 overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-300">
                              <thead>
                                <tr>
                                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                                    Player
                                  </th>
                                  {Array.from({ length: 6 }, (_, i) => (
                                    <th key={i} scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">
                                      Inning {i + 1}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {battingOrder.map((player) => (
                                  <tr key={player._id}>
                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                                      {player.firstName} {player.lastName}
                                    </td>
                                    {Array.from({ length: 6 }, (_, i) => {
                                      const inning = i + 1;
                                      const lineup = lineups.find(l => l.inning === inning);
                                      const position = lineup ? Object.entries(lineup.positions).find(
                                        ([_, p]) => p?._id === player._id
                                      )?.[0] : null;
                                      
                                      return (
                                        <td key={i} className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center">
                                          {position || '-'}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </Dialog.Panel>
                  </Transition.Child>
                </div>
              </div>
            </Dialog>
          </Transition.Root>

          {/* Innings Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {Array.from({ length: 6 }, (_, i) => {
              const inning = i + 1;
              const lineup = lineups.find(l => l.inning === inning);
              if (!lineup) return null;

              return (
                <div 
                  key={inning} 
                  className={`p-4 rounded-lg border ${
                    currentInning === inning 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">Inning {inning}</h3>
                    <button
                      onClick={() => setCurrentInning(currentInning === inning ? null : inning)}
                      className="text-sm text-blue-500 hover:text-blue-700"
                    >
                      {currentInning === inning ? 'Done' : 'Edit'}
                    </button>
                  </div>
                  <div className="space-y-1">
                    {POSITIONS.map((position) => {
                      const player = lineup.positions[position];
                      return (
                        <div 
                          key={position} 
                          className={`text-sm p-1 rounded ${
                            !player ? 'bg-red-50 border border-red-200' : ''
                          }`}
                        >
                          <span className="font-medium">{position}:</span>{' '}
                          {player ? (
                            <span className="inline-block truncate">
                              {player.firstName} {player.lastName}
                            </span>
                          ) : (
                            <span className="text-red-500">Unassigned</span>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Bench Players Section */}
                    <div className="mt-4 pt-2 border-t border-gray-200">
                      <h4 className="text-xs font-medium text-gray-500 mb-1">Bench Players:</h4>
                      <div className="space-y-1">
                        {battingOrder
                          .filter(player => 
                            availablePlayers.includes(player._id) && 
                            !Object.values(lineup.positions).some(p => p?._id === player._id)
                          )
                          .map(player => (
                            <div key={player._id} className="text-xs text-gray-600">
                              {player.firstName} {player.lastName}
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Position Assignment Section */}
          {currentInning !== null && (
            <div className="mt-6 border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Edit Inning {currentInning} Positions</h3>
                <button
                  onClick={handleGenerateCurrentInning}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Generate Positions
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {POSITIONS.map((position) => {
                  if (!currentLineup) {
                    console.log('No current lineup in render');
                    return null;
                  }
                  
                  const availablePlayers = availablePlayersByPosition[position] || [];
                  console.log(`Rendering position ${position}:`, {
                    currentPlayer: currentLineup.positions[position],
                    availablePlayers: availablePlayers.map(p => `${p.firstName} ${p.lastName}`)
                  });
                  
                  return (
                    <div key={position} className="p-4 bg-gray-50 rounded">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {position}
                      </label>
                      <select
                        value={currentLineup.positions[position]?._id || ''}
                        onChange={(e) => {
                          const player = e.target.value 
                            ? players.find(p => p._id === e.target.value) || null
                            : null;
                          handlePositionAssignment(position, player);
                        }}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">Select Player</option>
                        {availablePlayers.map((player) => (
                          <option key={player._id} value={player._id}>
                            {player.firstName} {player.lastName} ({getPlayerInningsCount(player._id)} innings)
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 