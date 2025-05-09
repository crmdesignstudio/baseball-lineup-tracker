const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

export interface Team {
  _id: string;
  name: string;
  description?: string;
  players: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Player {
  _id: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number;
  positions: string[];
  battingOrder?: number;
  team: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Game {
  _id: string;
  team: string;
  opponent: string;
  date: string;
  location: string;
  battingOrder?: { playerId: string; battingOrder: number }[];
  pitcherOrder?: string[];
  availablePlayers?: string[];
  lineups?: {
    inning: number;
    positions: {
      position: string;
      playerId: string | null;
    }[];
  }[];
}

const getAuthHeader = (): Record<string, string> => {
  const token = localStorage.getItem('auth-storage');
  if (token) {
    const parsedToken = JSON.parse(token);
    return { Authorization: `Bearer ${parsedToken.state.token}` };
  }
  return {};
};

export const api = {
  // Auth
  async login(email: string): Promise<{ token: string }> {
    const response = await fetch(`${API_URL}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) throw new Error('Failed to login');
    return response.json();
  },

  // Teams
  async getTeams(): Promise<Team[]> {
    const response = await fetch(`${API_URL}/teams`, {
      headers: getAuthHeader(),
    });
    if (!response.ok) throw new Error('Failed to fetch teams');
    return response.json();
  },

  async getTeam(id: string): Promise<Team> {
    const response = await fetch(`${API_URL}/teams/${id}`, {
      headers: getAuthHeader(),
    });
    if (!response.ok) throw new Error('Failed to fetch team');
    return response.json();
  },

  async createTeam(name: string, description: string): Promise<Team> {
    const response = await fetch(`${API_URL}/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ name, description }),
    });
    if (!response.ok) throw new Error('Failed to create team');
    return response.json();
  },

  async updateTeam(id: string, name: string, description: string): Promise<Team> {
    const response = await fetch(`${API_URL}/teams/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ name, description }),
    });
    if (!response.ok) throw new Error('Failed to update team');
    return response.json();
  },

  async deleteTeam(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/teams/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    if (!response.ok) throw new Error('Failed to delete team');
  },

  // Players
  async getTeamPlayers(teamId: string): Promise<Player[]> {
    const response = await fetch(`${API_URL}/players/team/${teamId}`, {
      headers: getAuthHeader(),
    });
    if (!response.ok) throw new Error('Failed to fetch players');
    return response.json();
  },

  async createPlayer(
    firstName: string,
    lastName: string,
    jerseyNumber: number,
    positions: string[],
    teamId: string
  ): Promise<Player> {
    const response = await fetch(`${API_URL}/players`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({
        firstName,
        lastName,
        jerseyNumber,
        positions,
        teamId,
      }),
    });
    if (!response.ok) throw new Error('Failed to create player');
    return response.json();
  },

  async updatePlayer(
    id: string,
    firstName: string,
    lastName: string,
    jerseyNumber: number,
    positions: string[]
  ): Promise<Player> {
    const response = await fetch(`${API_URL}/players/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({
        firstName,
        lastName,
        jerseyNumber,
        positions,
      }),
    });
    if (!response.ok) throw new Error('Failed to update player');
    return response.json();
  },

  async deletePlayer(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/players/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    if (!response.ok) throw new Error('Failed to delete player');
  },

  async updateBattingOrder(teamId: string, playerOrders: { playerId: string; battingOrder: number }[]): Promise<Player[]> {
    const response = await fetch(`${API_URL}/players/team/${teamId}/batting-order`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ playerOrders }),
    });
    if (!response.ok) throw new Error('Failed to update batting order');
    return response.json();
  },

  // Games
  async getTeamGames(teamId: string): Promise<Game[]> {
    const response = await fetch(`${API_URL}/games/team/${teamId}`, {
      headers: getAuthHeader(),
    });
    if (!response.ok) throw new Error('Failed to fetch games');
    return response.json();
  },

  async getGames(teamId: string): Promise<Game[]> {
    const response = await fetch(`${API_URL}/games/team/${teamId}`, {
      headers: getAuthHeader(),
    });
    if (!response.ok) throw new Error('Failed to fetch games');
    return response.json();
  },

  async getGame(id: string): Promise<Game> {
    const response = await fetch(`${API_URL}/games/${id}`, {
      headers: getAuthHeader(),
    });
    if (!response.ok) throw new Error('Failed to fetch game');
    return response.json();
  },

  async createGame(
    teamId: string,
    opponent: string,
    date: Date,
    isHome: boolean
  ): Promise<Game> {
    const response = await fetch(`${API_URL}/games`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({
        teamId,
        opponent,
        date,
        isHome
      }),
    });
    if (!response.ok) throw new Error('Failed to create game');
    return response.json();
  },

  async updateGame(id: string, data: Partial<Game>): Promise<Game> {
    const response = await fetch(`${API_URL}/games/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update game');
    return response.json();
  },

  async deleteGame(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/games/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    if (!response.ok) throw new Error('Failed to delete game');
  },
}; 