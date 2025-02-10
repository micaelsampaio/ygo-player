import { useEffect } from 'react'
import { YGOProps } from './YGOCore/types/types';

import YUBEL from './decks/YUBEL_FS.json';
import CHIMERA from './decks/CHIMERA.json';

function App() {

  useEffect(() => {
    const ygo: any = document.querySelector("ygo-player");
    console.log("YGO", ygo);

    const config: YGOProps = {
      players: [{
        name: 'Player 1',
        mainDeck: YUBEL.mainDeck as any,
        extraDeck: YUBEL.extraDeck as any,
      },
      {
        name: 'Player 2',
        mainDeck: CHIMERA.mainDeck as any,
        extraDeck: CHIMERA.extraDeck as any,
      }],
      options: {
        fieldState: [
          // { id: 93729896, zone: "H" }, nightmare throne
          //{ id: 62318994, zone: "H" } lotus
          //{ id: 60764609, zone: "H" }, // engraver
          //{ id: 23434538, zone: "H" }, // maxx c
          //     // { id: 62318994, zone: "H" }, // lotus
          //     //{ id: 62318994, zone: "M-1" }, // lotus
          //     //{ id: 90829280, zone: "M-3", position: "faceup-defense" }, // spirit of yubel
        ]
      }
    };

    ygo.editor(config);
  })

  return (
    <div>
      <ygo-player />
    </div>
  )
}

export default App
