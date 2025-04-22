import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { User, Users, Plus } from "lucide-react";
import { Logger } from "../../utils/logger";
import { useKaibaNet } from "../../hooks/useKaibaNet";
import { Button, Card, TextField } from "../UI";

// Create a logger instance
const logger = Logger.createLogger("RoomLobbiesPage");

// Styled components
const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  margin: 0;
`;

const RoomsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
`;

const RoomCard = styled(Card)`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  height: 200px;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  }
`;

const RoomHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const IconBox = styled.div`
  background-color: #0078d4;
  padding: 0.5rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const RoomTitle = styled.h3`
  margin: 0;
  font-size: 1.2rem;
`;

const RoomInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const RoomStats = styled.div`
  display: flex;
  justify-content: space-between;
  color: #888;
  font-size: 0.9rem;
  margin-top: auto;
`;

const CreateRoom = styled(RoomCard)`
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 120, 212, 0.1);
  border: 2px dashed #0078d4;
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled(Card)`
  width: 400px;
  padding: 2rem;
`;

const ModalTitle = styled.h3`
  margin-top: 0;
  margin-bottom: 1.5rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
`;

const FilterBar = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 1.5rem;
`;

const SearchContainer = styled.div`
  position: relative;
  width: 300px;
`;

interface Room {
  id: string;
  name: string;
  host: string;
  players: number;
  maxPlayers: number;
  status: "waiting" | "playing" | "finished";
  created: Date;
}

const RoomLobbiesPage: React.FC = () => {
  const navigate = useNavigate();
  const { kaibaNet } = useKaibaNet();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRooms();

    // Set up interval to refresh rooms every 30 seconds
    const intervalId = setInterval(fetchRooms, 30000);

    return () => clearInterval(intervalId);
  }, []);

  const fetchRooms = async () => {
    try {
      setIsLoading(true);

      // This would be replaced with actual API call to get rooms from KaibaNet
      if (kaibaNet && kaibaNet.connected) {
        logger.info("Fetching rooms from KaibaNet");

        // Example placeholder for room data - replace with actual implementation
        // const roomsData = await kaibaNet.getRooms();

        // For now, using mock data
        const mockRooms: Room[] = [
          {
            id: "room-1",
            name: "Duelist Kingdom",
            host: "Yugi",
            players: 1,
            maxPlayers: 2,
            status: "waiting",
            created: new Date(),
          },
          {
            id: "room-2",
            name: "Battle City",
            host: "Kaiba",
            players: 2,
            maxPlayers: 2,
            status: "playing",
            created: new Date(),
          },
          {
            id: "room-3",
            name: "Shadow Realm",
            host: "Marik",
            players: 1,
            maxPlayers: 2,
            status: "waiting",
            created: new Date(),
          },
        ];

        setRooms(mockRooms);
      } else {
        logger.warn("KaibaNet not connected, can't fetch rooms");
        setRooms([]);
      }
    } catch (error) {
      logger.error("Error fetching rooms:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newRoomName.trim()) {
      return;
    }

    try {
      logger.info("Creating new room:", newRoomName);

      // This would be replaced with actual API call
      if (kaibaNet && kaibaNet.connected) {
        // const roomId = await kaibaNet.createRoom(newRoomName);
        const roomId = `room-${Date.now()}`; // Placeholder

        // Close modal and navigate to the room
        setIsModalOpen(false);
        navigate(`/rooms/${roomId}`);
      } else {
        logger.warn("KaibaNet not connected, can't create room");
      }
    } catch (error) {
      logger.error("Error creating room:", error);
    }
  };

  const handleJoinRoom = (roomId: string) => {
    logger.info("Joining room:", roomId);
    navigate(`/rooms/${roomId}`);
  };

  const filteredRooms = rooms.filter(
    (room) =>
      room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.host.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageContainer>
      <Header>
        <Title>Room Lobbies</Title>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          Create New Room
        </Button>
      </Header>

      <FilterBar>
        <SearchContainer>
          <TextField
            type="text"
            placeholder="Search rooms by name or host..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
          />
        </SearchContainer>
        <Button variant="secondary" onClick={fetchRooms}>
          Refresh
        </Button>
      </FilterBar>

      <RoomsGrid>
        <CreateRoom onClick={() => setIsModalOpen(true)}>
          <Plus size={32} color="#0078d4" />
          <p>Create New Room</p>
        </CreateRoom>

        {filteredRooms.map((room) => (
          <RoomCard key={room.id} onClick={() => handleJoinRoom(room.id)}>
            <RoomHeader>
              <IconBox>
                <Users size={20} />
              </IconBox>
              <RoomTitle>{room.name}</RoomTitle>
            </RoomHeader>

            <RoomInfo>
              <div>
                <p>Host: {room.host}</p>
                <p>
                  Status:{" "}
                  {room.status === "waiting"
                    ? "Waiting for players"
                    : room.status === "playing"
                    ? "In progress"
                    : "Finished"}
                </p>
              </div>

              <RoomStats>
                <span>
                  <User
                    size={14}
                    style={{ verticalAlign: "middle", marginRight: "4px" }}
                  />
                  {room.players}/{room.maxPlayers} players
                </span>
                <span>{new Date(room.created).toLocaleTimeString()}</span>
              </RoomStats>
            </RoomInfo>
          </RoomCard>
        ))}

        {isLoading && <p>Loading rooms...</p>}
        {!isLoading && filteredRooms.length === 0 && !searchQuery && (
          <p>No rooms available. Create one to get started!</p>
        )}
        {!isLoading && filteredRooms.length === 0 && searchQuery && (
          <p>
            No rooms match your search. Try different keywords or create a new
            room.
          </p>
        )}
      </RoomsGrid>

      {isModalOpen && (
        <ModalOverlay onClick={() => setIsModalOpen(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Create New Room</ModalTitle>
            <Form onSubmit={handleCreateRoom}>
              <TextField
                label="Room Name"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                fullWidth
                autoFocus
              />
              <ButtonGroup>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create</Button>
              </ButtonGroup>
            </Form>
          </ModalContent>
        </ModalOverlay>
      )}
    </PageContainer>
  );
};

export default RoomLobbiesPage;
