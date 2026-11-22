import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PromptView } from "./assist-prompt-view";
import { LOC_HAND, LOC_MZONE, LOC_SZONE, type PromptData } from "../assist-prompt";

const POS_FACEUP_ATTACK = 0x1;
const POS_FACEDOWN_DEFENSE = 0x8;

function duelWith(options: Record<string, unknown> = {}, config: Record<string, unknown> = {}): any {
  return {
    ygo: { options, state: { getCardData: (code: number) => ({ name: `Card ${code}`, images: { small_url: `/img/${code}.jpg` } }) } },
    config: { options: config },
    perspective: { playerIndex: 0 },
    createCdnUrl: (p: string) => `https://cdn.test${p}`,
    assistController: { setHandPick: () => () => undefined, setPromptDoublePick: () => () => undefined, dropIntent: null, clearDropIntent: vi.fn() },
    globalHotKeysManager: { on: () => () => undefined },
    events: { on: () => () => undefined, off: vi.fn(), dispatch: vi.fn() },
    actionManager: { clearAction: vi.fn() },
  };
}

// "Target 1 card your opponent controls": a face-up monster of theirs, their Set card (named by an
// older server), one of your own monsters.
const prompt: PromptData = {
  player: 0, msg: 15, kind: "card", min: 1, max: 1,
  candidates: [
    { code: 1001, ctrl: 1, loc: LOC_MZONE, seq: 0, pos: POS_FACEUP_ATTACK },
    { code: 2002, ctrl: 1, loc: LOC_SZONE, seq: 1, pos: POS_FACEDOWN_DEFENSE },
    { code: 3003, ctrl: 1, loc: LOC_HAND, seq: 0, pos: 0 },
    { code: 4004, ctrl: 0, loc: LOC_MZONE, seq: 2, pos: POS_FACEDOWN_DEFENSE },
  ],
};

const render = (duel: any) => renderToStaticMarkup(
  <PromptView duel={duel} prompt={prompt} busy={false} pendingKey={null} respond={vi.fn()} onHover={vi.fn()} inDialog />,
);

describe("PromptView: a card the player can't see is a card back", () => {
  it("shows the opponent's Set card and hand card as backs, never by name or image, even when the server sent their codes", () => {
    const html = render(duelWith());
    expect(html).toContain("/img/1001.jpg");
    expect(html).toContain("Card 1001");
    // Your own face-down monster: you know it.
    expect(html).toContain("/img/4004.jpg");
    expect(html).not.toContain("2002");
    expect(html).not.toContain("3003");
    expect(html).toContain('aria-label="Set card"');
    expect(html).toContain('aria-label="Hidden card"');
    expect(html.match(/<img src="[^"]*card_back\.png"/g)).toHaveLength(2);
  });

  it("names them when the duel shows the opponent's cards (\"Show the bot's cards\", a collaborative room)", () => {
    for (const duel of [duelWith({}, { revealOpponentCards: true }), duelWith({ viewOpponentCards: true })]) {
      const html = render(duel);
      expect(html).toContain("/img/2002.jpg");
      expect(html).toContain("/img/3003.jpg");
      expect(html).not.toContain("card_back.png");
    }
  });

  it("a code 0 from the server (hidden information) is a back too", () => {
    const hidden = { ...prompt, candidates: prompt.candidates!.map((c) => (c.code === 2002 ? { ...c, code: 0 } : c)) };
    const html = renderToStaticMarkup(
      <PromptView duel={duelWith()} prompt={hidden} busy={false} pendingKey={null} respond={vi.fn()} onHover={vi.fn()} inDialog />,
    );
    expect(html).toContain('aria-label="Set card"');
  });
});
