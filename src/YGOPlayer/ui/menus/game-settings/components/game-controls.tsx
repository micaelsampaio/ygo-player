import { Modal } from "../../../components/Modal";

const shortcuts = [
  { keys: ["Arrow Left"], action: "Previous Duel Event" },
  { keys: ["Arrow Right"], action: "Next Duel Event" },
  { keys: ["Space"], action: "Play / Pause" },
  { keys: ["Esc"], action: "Open / Close menu" },
  { keys: ["Esc"], action: "Open Settins" },
  { keys: ["C"], action: "Toggle Game Controls" },
  { keys: ["D"], action: "Toggle Duel Log" },
  { keys: ["Shift", "D"], action: "Open Shortcuts Information" },
];

export function GamControlsDialog({ close }: { close: () => void }) {

  return (
    <Modal.Dialog embedded close={close} visible size="md">
      <Modal.Header>
        <div>Keyboard Shortcuts</div>
      </Modal.Header>
      <Modal.Body>
        <table className="ygo-simple-table ygo-w-full">
          {shortcuts.map(({ keys, action }, index) => (
            <tr key={index}>
              <td className="ygo-text-lg">{action}</td>
              <td>
                <div className="ygo-flex ygo-items-center ygo-justify-center ygo-w-full ygo-pt-2 ygo-pb-2" style={{ gap: "6Dpx" }}>
                  {keys.map((key, index2) => {
                    return <>
                      <div className="ygo-key" key={index + " " + index2}>{key}</div>
                      {index2 < keys.length - 1 && <div>+</div>}
                    </>
                  })}
                </div>
              </td>
            </tr>
          ))}
        </table>
      </Modal.Body>
    </Modal.Dialog >
  );
}
