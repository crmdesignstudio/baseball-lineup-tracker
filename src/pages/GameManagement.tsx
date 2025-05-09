import { useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';

interface Game {
  id: string;
  opponent: string;
  date: string;
  availablePlayers: string[];
  battingOrder: string[];
  pitchers: { player: string; innings: number[] }[];
}

export default function GameManagement() {
  const [games, setGames] = useState<Game[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="h-full">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Game Schedule
            </h1>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              Schedule Game
            </button>
          </div>
        </div>

        <div className="mt-8">
          {games.length === 0 ? (
            <div className="text-center bg-white rounded-lg shadow px-5 py-12">
              <h3 className="mt-2 text-sm font-medium text-gray-900">No games scheduled</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by scheduling a new game.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="btn btn-primary inline-flex items-center gap-2"
                >
                  <PlusIcon className="h-5 w-5" />
                  Schedule Game
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {games.map((game) => (
                <div key={game.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow duration-200">
                  <div className="p-6">
                    <div className="md:flex md:items-center md:justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-gray-900">
                          vs {game.opponent}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {new Date(game.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="mt-4 flex gap-3 md:mt-0">
                        <button className="btn btn-secondary text-sm">Edit</button>
                        <button className="btn btn-primary text-sm">View Lineup</button>
                      </div>
                    </div>
                    <div className="mt-6">
                      <h4 className="text-sm font-medium text-gray-900">Pitchers</h4>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {game.pitchers.map((pitcher, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                          >
                            {pitcher.player} ({pitcher.innings.join(', ')})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 