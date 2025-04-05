export function generateExportToMdCode(mainDeck: any, extraDeck: any) {
    console.log(mainDeck, extraDeck)

    const mainDeckWithamount = new Map();
    const extraDeckWithamount = new Map();

    mainDeck.forEach((card: any) => {
        if (mainDeckWithamount.has(card.konami_id)) {
            mainDeckWithamount.get(card.konami_id).amount++;
        } else {
            mainDeckWithamount.set(card.konami_id, { card: { name: card.name, type: parseCardType(card.type), gameId: String(card.konami_id) }, amount: 1 });
        }
    });

    extraDeck.forEach((card: any) => {
        if (extraDeckWithamount.has(card.konami_id)) {
            extraDeckWithamount.get(card.konami_id).amount++;
        } else {
            extraDeckWithamount.set(card.konami_id, { card: { name: card.name, gameId: String(card.konami_id) }, amount: 1 });
        }
    });

    const monsters: any[] = [];
    const spells: any[] = [];
    const traps: any[] = [];
    const extra: any[] = [];

    const parseCard = (cardData: any) => {
        console.log("--> ", cardData);
        if (cardData.card.type === "Spell") {
            spells.push(cardData);
        }
        else if (cardData.card.type === "Trap") {
            traps.push(cardData);
        } else {
            monsters.push(cardData);
        }
    }

    const parseExtraCard = (cardData: any) => {
        extra.push(cardData);
    }

    console.log("monsters", monsters);

    mainDeckWithamount.forEach(parseCard);
    extraDeckWithamount.forEach(parseExtraCard);

    const code = `
const ebn = document.getElementsByName.bind(document);
const ebi = document.getElementById.bind(document);
const mce = ebn("monsterCardId");
const ece = ebn("extraCardId");
const sce = ebn("spellCardId");
const tce = ebn("trapCardId");

for (let i = 1; i < 66; i++) {
    ebi("monm_" + i).value = null;
    ebi("monum_" + i).value = null;
    ebi("trnm_" + i).value = null;
    ebi("trnum_" + i).value = null;
    ebi("spnm_" + i).value = null;
    ebi("spnum_" + i).value = null;
}
for (let i = 1; i <= 20; i++) {
    ebi("exnm_" + i).value = null;
    ebi("exnum_" + i).value = null;
}
ebi("dckTagMst").value = 93;
ebi("deck_type").value = 3;

${JSON.stringify(monsters)}.forEach(({
    card,
    amount
}, i) => {
    ebi("monum_" + (i + 1)).value = amount;
    mce[i].value = card.gameId;
});

${JSON.stringify(spells)}.forEach(({
    card,
    amount
}, i) => {
    ebi("spnum_" + (i + 1)).value = amount;
     sce[i].value = card.gameId;
});

${JSON.stringify(traps)}.forEach(({
    card,
    amount
}, i) => {
    ebi("trnum_" + (i + 1)).value = amount;
    tce[i].value = card.gameId;
});

${JSON.stringify(extra)}.forEach(({
    card,
    amount
}, i) => {
    ebi("exnum_" + (i + 1)).value = amount;
    ece[i].value = card.gameId;
});

Regist();
`;

    return code.replace(/\n/g, ' ').trim();
}

function parseCardType(type: string) {
    if (type.includes("Spell")) return "Spell";
    if (type.includes("Trap")) return "Trap";
    return "Monster";
}