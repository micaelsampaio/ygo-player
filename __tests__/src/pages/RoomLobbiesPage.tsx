import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import RoomLobby from "../components/RoomLobby";
import { useKaibaNet } from "../contexts/KaibaNetContext";

const PageContainer = styled.div`
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const PageTitle = styled.h1`
  color: white;
  margin-bottom: 1.5rem;
  font-size: 1.75rem;
  border-bottom: 1px solid #333;
  padding-bottom: 0.75rem;
`;

export default function RoomLobbiesPage() {
  const { kaibaNet } = useKaibaNet();
  const [playerId, setPlayerId] = useState("");
  const [rooms, setRooms] = useState(new Map());
  const navigate = useNavigate();

  useEffect(() => {
    if (!kaibaNet) return;

    // Get player ID
    const id = kaibaNet.getPeerId();
    setPlayerId(id);

    // Set up room discovery
    const onRoomsUpdate = (discoveredRooms) => {
      setRooms(new Map(discoveredRooms));
    };

    kaibaNet.on("roomsUpdate", onRoomsUpdate);
    kaibaNet.discoverRooms();

    return () => {
      kaibaNet.removeListener("roomsUpdate", onRoomsUpdate);
    };
  }, [kaibaNet]);

  const handleRoomJoin = async (roomId) => {
    try {
      await kaibaNet.joinRoom(roomId);
      navigate(`/duel/${roomId}`);
    } catch (error) {
      console.error("Failed to join room:", error);
    }
  };

  return (
    <PageContainer>
      <PageTitle>Active Duel Rooms</PageTitle>
      <RoomLobby
        playerId={playerId}
        rooms={rooms}
        onRoomJoin={handleRoomJoin}
      />
    </PageContainer>
  );
}
