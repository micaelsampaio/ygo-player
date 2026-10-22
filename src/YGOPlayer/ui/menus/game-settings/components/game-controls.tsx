import { Fragment } from "react";
import { Modal } from "../../../components/Modal";

const shortcuts = [
  { keys: ["N"], action: "Next phase" },
  { keys: ["E"], action: "End turn" },
  { keys: ["K"], action: "Pass priority" },
  { keys: ["Arrow Left"], action: "Undo (previous duel event)" },
  { keys: ["Arrow Right"], action: "Redo (next duel event)" },
  { keys: ["Space"], action: "Play / Pause · Assisted Mode: Continue / Don't respond, or the only option" },
  { keys: ["Esc"], action: "Cancel what you're doing · with nothing open, Settings" },
  { keys: ["D"], action: "Toggle duel log" },
  { keys: ["C"], action: "Toggle replay controls" },
  { keys: ["Shift", "P"], action: "Keyboard shortcuts" },
];

export function GamControlsDialog({ close }: { close: () => void }) {

  return (
    <Modal.Dialog embedded close={close} visible size="md">
      <Modal.Header>
        <div>Keyboard Shortcuts</div>
      </Modal.Header>
      <Modal.Body>
        <table className="ygo-simple-table ygo-w-full">
          <tbody>
          {shortcuts.map(({ keys, action }, index) => (
            <tr key={action}>
              <td className="ygo-text-lg">{action}</td>
              <td>
                <div className="ygo-flex ygo-items-center ygo-justify-center ygo-w-full ygo-pt-2 ygo-pb-2" style={{ gap: "6px" }}>
                  {keys.map((key, index2) => {
                    return <Fragment key={key}>
                      <div className="ygo-key">{key}</div>
                      {index2 < keys.length - 1 && <div>+</div>}
                    </Fragment>
                  })}
                </div>
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      </Modal.Body>
    </Modal.Dialog >
  );
}
