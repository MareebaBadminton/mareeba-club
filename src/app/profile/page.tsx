'use client';

import { useEffect, useState } from 'react';
import ProfileUpdate from '@/components/ProfileUpdate';
import { getAllPlayers } from '@/lib/utils/playerUtils';

export default function ProfilePage() {
  const [playerId, setPlayerId] = useState<string | null>(null);

  useEffect(() => {
    const loadPlayerId = async () => {
      // For this example, we'll load the first player
      // In a real application, you would get the logged-in user's ID
      const players = await getAllPlayers();
      if (players.length > 0) {
        setPlayerId(players[0].id);
      }
    };
    loadPlayerId();
  }, []);

  if (!playerId) {
    return <div className="p-4">Loading player information...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Player Profile</h1>
      <ProfileUpdate playerId={playerId} />
    </div>
  );
} 