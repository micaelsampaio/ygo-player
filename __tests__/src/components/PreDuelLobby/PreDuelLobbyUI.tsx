import { getPreGameAction } from "./actions";
import { usePreDuelLobbyContext } from "./components/context"
import { PlayerLobby } from "./components/PlayerLobby";
import { PreGameBoard } from "./components/PreGameBoard";

export function PreDuelLobbyUI() {
  const { action } = usePreDuelLobbyContext();

  const ActionComponent = getPreGameAction(action?.name);

  return <>
    <div className="flex h-full-w-navbar w-full">
      <div className="shrink-0 w-[350px] h-full bg-blue-950">
        <PlayerLobby player={0} />
      </div>
      <div className="grow h-full">
        <PreGameBoard />
      </div>
      <div className="shrink-0 w-[350px] h-full bg-red-950">
        {/* <PlayerLobby player={1} /> */}
      </div>
    </div>

    {ActionComponent && <ActionComponent name={action?.name} {...action?.data || {}} />}
  </>
}