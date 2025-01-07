class t{constructor(){this.commandId=-1,this.parent=null}init(t){this.YGO=t,this.commandId=this.YGO.getNextCommandId()}getCommandId(){var t;return(null===(t=this.parent)||void 0===t?void 0:t.commandId)||this.commandId}execChildCommand(t){return t.parent=this,t.init(this.YGO),t.exec(),t}undoChildCommand(t){return null==t||t.undo(),t}undoMultipleChildCommand(t){var e;for(let a=t.length-1;a>=0;--a)null===(e=t[a])||void 0===e||e.undo()}execMultipleChildCommand(t){for(const e of t)this.execChildCommand(e)}isValid(){return!0}exec(){}undo(){}toJSON(){var t;const e=this,a=e.data||{};return{type:(null===(t=null==e?void 0:e.constructor)||void 0===t?void 0:t.name)||a.type||"NO_TYPE",data:a}}}var e,a;!function(t){var e;(e=t.LogType||(t.LogType={})).NormalSummon="Normal Summon",e.SetMonster="Set Monster",e.SendToGY="Send To GY",e.Banish="Banish",e.BanishFD="Banish FD",e.DrawCardFromDeck="Draw From Deck",e.MillCardFromDeck="Mill From Deck",e.TributeSummon="Tribute Summon",e.TributeSet="Tribute Set",e.ToHand="To Hand",e.ToTopDeck="To Top Deck",e.ToBottomDeck="To Bottom Deck",e.SpecialSummon="Special Summon",e.FusionSummon="Fusion Summon",e.SynchroSummon="Synchro Summon",e.LinkSummon="Link Summon",e.XYZSummon="XYZ Summon",e.XYZAttachMaterial="XYZ Attach Material",e.XYZDetachMaterial="XYZ Detach Material",e.XYZOverlay="XYZOverlay",e.SetST="Set ST",e.Activate="Activate",e.ChangeBattlePosition="Change Battle Position",e.MoveCard="Move Card",e.Shuffle="Shuffle",e.ToST="To ST",e.Reveal="Reveal",e.Target="Target",e.FieldSpell="Field Spell"}(e||(e={}));class s extends t{constructor(t){super(),this.type="Activate",this.data=t}exec(){const t=this.YGO.state.getCardById(this.data.id,this.data.originZone||this.data.zone);this.data.originZone?(this.YGO.state.removeCard(this.data.originZone),this.YGO.state.setCard(t,this.data.zone),console.log(`Exec: Activate ${this.data.id} from ${this.data.originZone} in ${this.data.zone}`)):console.log(`Exec: Activate ${this.data.id} in ${this.data.zone}`),this.prevPosition=t.position,"Spell Card"!==t.type&&"Trap Card"!==t.type||(t.position="faceup"),this.YGO.duelLog.dispatch({player:this.data.player,commandId:this.getCommandId(),type:e.LogType.Activate,id:this.data.id,originZone:this.data.originZone,zone:this.data.zone})}undo(){const t=this.YGO.state.getCardById(this.data.id,this.data.zone);this.data.originZone?(this.YGO.state.removeCard(this.data.originZone),this.YGO.state.setCard(t,this.data.zone),console.log(`Undo: Activate ${this.data.id} from ${this.data.originZone} in ${this.data.zone}`)):console.log(`Undo: Activate ${this.data.id} in ${this.data.zone}`),this.prevPosition&&(t.position=this.prevPosition)}}!function(t){t[t.NormalMonster=0]="NormalMonster",t[t.EffectMonster=1]="EffectMonster",t[t.RitualMonster=2]="RitualMonster",t[t.Spell=3]="Spell",t[t.Trap=4]="Trap",t[t.FusionMonster=5]="FusionMonster",t[t.SynchroMonster=6]="SynchroMonster",t[t.XYZMonster=7]="XYZMonster",t[t.LinkMonster=8]="LinkMonster"}(a||(a={}));class i{static isLinkMonster(t){var e;return null===(e=t.typeline)||void 0===e?void 0:e.includes("Link")}static isXYZMonter(t){var e;return null===(e=t.typeline)||void 0===e?void 0:e.includes("Xyz")}static isPendulumCard(t){var e;return null===(e=t.frameType)||void 0===e?void 0:e.includes("pendulum")}static isFaceUp(t){return"faceup"===t.position||"faceup-attack"===t.position}static isFaceDown(t){return!this.isFaceUp(t)}static hasLinkMonstersInField(t){return!!t.monsterZone.some((t=>!!t&&i.isLinkMonster(t)))||t.extraMonsterZone.some((t=>!!t&&i.isLinkMonster(t)))}static hasXyzMonstersInField(t){return!!t.monsterZone.some((t=>!!t&&i.isXYZMonter(t)))||t.extraMonsterZone.some((t=>!!t&&i.isXYZMonter(t)))}static getPlayerIndexFromZone(t){if(t.includes("2-"))return 1;switch(t){case"M2":case"H2":case"F2":case"GY2":case"EMZ2-1":case"EMZ2-2":return 1;default:return 0}}static createZone(t,e,a){return void 0===a?`${t}${0===e?"":"2"}`:`${t}${0===e?"":"2"}-${a}`}static getZoneInfo(t){const e=t.split("-");let a=0,s=e[0];const i=e.length>1?Number(e[1]):null;return e[0].endsWith("2")&&(a=1,s=s.substring(0,s.length-1)),{zone:s,player:a,zonePosition:i}}static getCardBaseType(t){return t.frameType.startsWith("effect")?a.EffectMonster:t.frameType.startsWith("spell")?a.Spell:t.frameType.startsWith("ritual")?a.RitualMonster:t.frameType.startsWith("trap")?a.Trap:t.frameType.includes("fusion")?a.FusionMonster:t.frameType.includes("synchro")?a.SynchroMonster:t.frameType.includes("xyz")?a.XYZMonster:t.frameType.includes("link")?a.LinkMonster:a.NormalMonster}static getCardsBaseType(t){return t.map((t=>i.getCardBaseType(t)))}static toSortedCards(t){return this.sortCards([...t])}static sortCards(t){const e=t,a=i.getCardsBaseType(e);for(let t=0;t<e.length-1;++t)for(let s=0;s<e.length-t-1;++s)(a[s]>a[s+1]||a[s]===a[s+1]&&e[s].name>e[s+1].name)&&([e[s],e[s+1]]=[e[s+1],e[s]],[a[s],a[s+1]]=[a[s+1],a[s]]);return e}static shuffleCards(t){const e=Array(t.length);for(let a=0;a<t.length;++a){const s=Math.floor(Math.random()*t.length);e[a]=s;const i=t[a];t[a]=t[s],t[s]=i}return e}}class n{static getPlayerIndexFromZone(t){return i.getPlayerIndexFromZone(t)}static parseMainDeck({mainDeck:t,player:e}){return t.map((t=>n.parseCard({card:t,player:e,isMainDeckCard:!0})))}static parseExtraDeck({extraDeck:t,player:e}){const a=t.map((t=>n.parseCard({card:t,player:e,isMainDeckCard:!1})));return i.sortCards(a),a}static parseCard({card:t,player:e,isMainDeckCard:a}){return t.owner=e,t.originalOwner=e,t.materials=[],t.isMainDeckCard=a,t.position="facedown",t}static getCardsInGame(t){const e=new Map;for(const a of t){for(const t of a.mainDeck)e.has(t.id)||e.set(t.id,t);for(const t of a.extraDeck)e.has(t.id)||e.set(t.id,t)}return e}static getOverlayZone(t){const e=n.getPlayerIndexFromZone(t),a=t.split("-")[1];return t.startsWith("EMZ")?`ORU${0===e?"":"2"}-${a}`:`ORUEMZ${0===e?"":"2"}-${a}`}static initializePlayersFields(t){const{shuffleDecks:e=!0}=t.options||{};let a=0;const s=[{lp:8e3,player:{name:"test"},mainDeck:[],extraDeck:[],hand:[],initialHandSize:5,initialMainDeckOrder:[],monsterZone:[null,null,null,null,null],spellTrapZone:[null,null,null,null,null],fieldZone:null,extraMonsterZone:[null,null],graveyard:[],banishedZone:[]},{lp:8e3,player:{name:"test2"},mainDeck:[],extraDeck:[],hand:[],initialMainDeckOrder:[],initialHandSize:5,monsterZone:[null,null,null,null,null],spellTrapZone:[null,null,null,null,null],fieldZone:null,extraMonsterZone:[null,null],graveyard:[],banishedZone:[]}];for(let e=0;e<t.players.length;++e){const i=t.players[e],o=s[e];if(o.initialMainDeckOrder=i.mainDeck.map(((t,e)=>e)),o.mainDeck=n.parseMainDeck({mainDeck:i.mainDeck,player:e}),o.extraDeck=n.parseExtraDeck({extraDeck:i.extraDeck,player:e}),o.mainDeck.forEach((t=>t.index=++a)),o.extraDeck.forEach((t=>t.index=++a)),i.mainDeckOrder)for(let t=0;t<i.mainDeckOrder.length;++t){const e=i.mainDeckOrder[t],a=o.mainDeck[e];o.mainDeck[e]=o.mainDeck[t],o.mainDeck[t]=a}}return e&&s.forEach(((e,a)=>{t.players[a]&&(e.initialMainDeckOrder=t.players[a].mainDeckOrder||i.shuffleCards(e.mainDeck))})),s}static getFieldsAsString(t){var e,a;const s=[];s.push("---- FIELD STATE ----");const i=t.getField(0),n=t.getField(1);return s.push("Player2: "+i.player.name),s.push("Hand: "+n.hand.map((t=>t.name)).join(" | ")),s.push("Spell/Trap Zone: "+n.spellTrapZone.map((t=>(null==t?void 0:t.name)||"_")).join(" | ")),s.push("Monster Zone: "+n.monsterZone.map((t=>(null==t?void 0:t.name)||"_")).join(" | ")),s.push("-------"),s.push("Extra Monster Zone: "+((null===(e=i.extraMonsterZone[0]||n.extraMonsterZone[0])||void 0===e?void 0:e.name)||"_")+" | "+((null===(a=i.extraMonsterZone[1]||n.extraMonsterZone[1])||void 0===a?void 0:a.name)||"_")),s.push("-------"),s.push("Monster Zone: "+i.monsterZone.map((t=>(null==t?void 0:t.name)||"_")).join(" | ")),s.push("Spell/Trap Zone: "+i.spellTrapZone.map((t=>(null==t?void 0:t.name)||"_")).join(" | ")),s.push("Hand: "+i.hand.map((t=>t.name)).join(" | ")),s.push("Player1: "+i.player.name),s.join("\n")}}class o extends t{constructor(t){super();const e=t.type||"Move Card";this.type=e,this.data=t,this.materialsToGY=[],this.data.type=e}exec(){console.log(`Exec: ${this.data.type} ${this.data.id} from: ${this.data.originZone} to: ${this.data.zone}`);const{log:t=!0}=this.data,a=this.YGO.state.getCardById(this.data.id,this.data.originZone);if("ED"!==this.data.zone&&"ED2"!==this.data.zone||(this.data.position=i.isPendulumCard(a)?"faceup":"facedown"),this.data.position&&(this.prevPosition=a.position,a.position=this.data.position),this.sendMaterialsToGy(a,this.data.zone)){const t=n.getOverlayZone(this.data.originZone);this.materialsToGY=a.materials,a.materials.forEach((a=>{this.YGO.state.setCard(a,"GY"),this.YGO.duelLog.dispatch({player:this.data.player,commandId:this.getCommandId(),type:e.LogType.SendToGY,id:a.id,originZone:t,zone:this.data.zone,reason:"XYZ Material"})})),a.materials=[]}this.YGO.state.moveCard(a,this.data.originZone,this.data.zone),t&&this.YGO.duelLog.dispatch({player:this.data.player,commandId:this.getCommandId(),type:this.type,id:this.data.id,originZone:this.data.originZone,zone:this.data.zone,position:a.position})}undo(){console.log(`Undo: ${this.data.type} ${this.data.id} from: ${this.data.originZone} to: ${this.data.zone}`);const t=this.YGO.state.getCardById(this.data.id,this.data.zone);this.materialsToGY.length>0&&(this.materialsToGY.forEach((()=>{this.YGO.state.setCard(null,"GY")})),t.materials=this.materialsToGY),this.prevPosition&&(t.position=this.prevPosition),this.YGO.state.moveCard(t,this.data.zone,this.data.originZone)}sendMaterialsToGy(t,e){return!(!t.materials||0===t.materials.length)&&(!!this.data.zone.startsWith("GY")||("B"===this.data.zone||"B2"===this.data.zone||!(!this.data.zone.startsWith("B-")&&!this.data.zone.startsWith("B2-"))))}}class d extends t{constructor(t){super(),this.data=t,this.data.position=this.data.position||"faceup",this.type="faceup"===this.data.position?"Banish":"Banish FD",this.zone=`B${0===this.data.player?"":"2"}-1`,this.banishCommand=new o({player:this.data.player,type:this.type,id:this.data.id,originZone:this.data.originZone,position:this.data.position,zone:this.zone})}exec(){this.execChildCommand(this.banishCommand)}undo(){this.undoChildCommand(this.banishCommand)}}class r extends t{constructor(t){super(),this.type="Destroy",this.data=t,this.zone=t.zone||i.createZone("GY",this.data.player,1),this.moveCardCommand=new o({player:this.data.player,type:this.type,id:this.data.id,originZone:this.data.originZone,zone:this.zone})}exec(){this.execChildCommand(this.moveCardCommand)}undo(){this.undoChildCommand(this.moveCardCommand)}}class h extends t{constructor(t){super(),this.type="Draw From Deck",this.data=t,this.data.numberOfCards=this.data.numberOfCards||1,this.cards=[]}exec(){console.log(`Exec: Draw ${this.data.numberOfCards} from Deck`),this.cards=[];const t=this.YGO.state.fields[this.data.player];for(let a=0;a<this.data.numberOfCards;++a){const a=t.mainDeck.pop();console.log("DRAW",a.name),t.hand.push(a),this.cards.push(a);const s=`H-${t.hand.length}`;this.YGO.duelLog.dispatch({commandId:this.getCommandId(),player:this.data.player,type:e.LogType.DrawCardFromDeck,id:a.id,zone:s})}}undo(){console.log(`Undo: Draw ${this.data.numberOfCards} from Deck`);const t=[...this.cards].reverse(),e=this.YGO.state.fields[this.data.player];console.log("CARD DRAW UNDO"),console.log(t.map((t=>t.name))),console.log("DECK 1>>",e.mainDeck.length);for(const a of t){const t=e.hand.findIndex((t=>t===a));-1!==t&&e.hand.splice(t,1)}e.mainDeck.push(...t),console.log(e.hand.map((t=>t.name))),console.log("DECK 2>>",e.mainDeck.length)}}class l extends t{constructor(t){super(),this.type="Reveal",this.data=t}exec(){this.YGO.duelLog.dispatch({type:e.LogType.Reveal,player:this.data.player,commandId:this.getCommandId(),id:this.data.id,zone:this.data.zone})}}class m extends t{constructor(t){super(),this.type="Field Spell",this.data=t,this.data.position="facedown"===t.position?"facedown":"faceup",this.commands=[],this.commands.push(new o({player:this.data.player,type:this.type,id:this.data.id,originZone:this.data.originZone,zone:this.data.zone,position:this.data.position})),this.data.reveal&&this.commands.push(new l({id:this.data.id,originZone:this.data.zone,player:this.data.player,zone:this.data.zone}))}exec(){this.execMultipleChildCommand(this.commands)}undo(){this.undoMultipleChildCommand(this.commands)}}class c extends t{constructor(t){super(),this.type="Send To GY",this.data=t,this.zone=t.zone||i.createZone("GY",this.data.player,1),this.moveCardCommand=new o({player:this.data.player,type:this.type,id:this.data.id,originZone:this.data.originZone,zone:this.zone})}exec(){this.execChildCommand(this.moveCardCommand)}undo(){this.undoChildCommand(this.moveCardCommand)}}class p extends t{constructor(t){super(),this.type="Link Summon",this.data=t,this.position="faceup-attack",this.commands=[],this.data.materials.forEach((t=>{this.commands.push(new c({player:this.data.player,id:t.id,originZone:t.zone,reason:"Link Summon"}))})),this.commands.push(new o({player:this.data.player,type:this.type,id:this.data.id,originZone:this.data.originZone,zone:this.data.zone,position:this.position,log:!1}))}exec(){this.execMultipleChildCommand(this.commands),this.YGO.duelLog.dispatch({player:this.data.player,commandId:this.getCommandId(),type:e.LogType.LinkSummon,id:this.data.id,originZone:this.data.originZone,zone:this.data.zone,materials:this.data.materials})}undo(){this.undoMultipleChildCommand(this.commands)}}class u extends t{constructor(t){super(),this.type="Mill From Deck";const{numberOfCards:e=1}=t;this.data=t,this.data.numberOfCards=Math.max(1,e),this.commands=[]}init(t){super.init(t);const e=this.YGO.getField(this.data.player),a=Math.min(this.data.numberOfCards,e.mainDeck.length);console.log(this.data),console.log("number",a);for(let t=0;t<a;++t){const a=e.mainDeck.length-1-t,s=e.mainDeck[a];console.log("WILL MILL ",s.id),this.commands.push(new c({id:s.id,originZone:i.createZone("D",this.data.player,a+1),player:this.data.player}))}}exec(){this.execMultipleChildCommand(this.commands)}undo(){this.undoMultipleChildCommand(this.commands)}}class C extends t{constructor(t){super(),this.type="Normal Summon",this.data=t,this.data.position="faceup-attack",this.moveCardCommand=new o({player:this.data.player,type:this.type,id:this.data.id,originZone:this.data.originZone,zone:this.data.zone,position:this.data.position})}exec(){this.execChildCommand(this.moveCardCommand)}undo(){this.undoChildCommand(this.moveCardCommand)}}class g extends t{constructor(t){super(),this.type="Set ST",this.data=t,this.moveCardCommand=new o({player:this.data.player,type:this.type,id:this.data.id,originZone:this.data.originZone,zone:this.data.zone,position:"facedown"})}exec(){this.execChildCommand(this.moveCardCommand)}undo(){this.undoChildCommand(this.moveCardCommand)}}class y extends t{constructor(t){super(),this.type="Set Monster",this.data=t,this.moveCardCommand=new o({player:this.data.player,type:this.type,id:this.data.id,originZone:this.data.originZone,zone:this.data.zone,position:"facedown"})}exec(){this.execChildCommand(this.moveCardCommand)}undo(){this.undoChildCommand(this.moveCardCommand)}}class f extends t{constructor(t){super(),this.data=t,this.type="Shuffle Deck"}exec(){const t=this.YGO.state.fields[this.data.player].mainDeck;if(this.cardPositions)for(let e=0;e<this.cardPositions.length;++e){const a=this.cardPositions[e],s=t[a];t[a]=t[e],t[e]=s}else this.cardPositions=i.shuffleCards(t);!1!==this.data.log&&this.YGO.duelLog.dispatch({player:this.data.player,commandId:this.getCommandId(),type:e.LogType.Shuffle})}undo(){const t=this.YGO.state.fields[this.data.player].mainDeck;for(let e=0;e<this.cardPositions.length;++e){const a=this.cardPositions[e],s=t[a];t[a]=t[e],t[e]=s}}}class Z extends t{constructor(t){super(),this.type="Special Summon",this.data=t,this.data.position=this.data.position||"faceup-attack","faceup-attack"!==this.data.position&&"faceup-defense"!==this.data.position&&(this.data.position="faceup-attack"),console.log(this.data),this.moveCardCommand=new o({player:this.data.player,type:"Special Summon",id:this.data.id,originZone:this.data.originZone,zone:this.data.zone,position:this.data.position})}exec(){this.execChildCommand(this.moveCardCommand)}undo(){this.undoChildCommand(this.moveCardCommand)}}class x extends t{constructor(t){super(),this.data=t,this.type=this.getCommandType()}isTopCard(){return"top"===this.data.position}getCommandType(){return this.isTopCard()?"To Top Deck":"To Bottom Deck"}getDeckIndex(){const t=this.YGO.state.fields[0].mainDeck;return this.isTopCard()?t.length+1:1}init(t){if(super.init(t),!this.commands){const t=this.getDeckIndex();this.zone=`D${0===this.data.player?"":"2"}-${t}`,this.commands=[],this.commands.push(new o({player:this.data.player,type:this.type,id:this.data.id,originZone:this.data.originZone,zone:this.zone}));const{shuffle:e=!1}=this.data;e&&this.commands.push(new f({player:this.data.player}))}}exec(){this.execMultipleChildCommand(this.commands)}undo(){this.undoMultipleChildCommand(this.commands)}}class D extends t{constructor(t){super(),this.type="Normal Summon",this.data=t,this.moveCardCommand=new o({player:this.data.player,type:this.type,id:this.data.id,originZone:this.data.originZone,zone:i.createZone("ED",this.data.player)})}exec(){this.execChildCommand(this.moveCardCommand)}undo(){this.undoChildCommand(this.moveCardCommand)}}class v extends t{constructor(t){super(),this.type="To Hand",this.data=t}init(t){super.init(t);const e=this.YGO.getField(this.data.player).hand.length+1;this.command=new o({player:this.data.player,type:this.type,id:this.data.id,originZone:this.data.originZone,zone:i.createZone("H",this.data.player,e),position:"facedown"})}exec(){this.execChildCommand(this.command)}undo(){this.undoChildCommand(this.command)}}class k extends t{constructor(t){super(),this.type="Tribute Set",this.data=t,this.data.position="facedown",this.commands=[],this.data.tributes.forEach((t=>{this.commands.push(new c({id:t.id,originZone:t.zone,player:this.data.player}))})),this.commands.push(new o({player:this.data.player,type:this.type,id:this.data.id,originZone:this.data.originZone,zone:this.data.zone,position:this.data.position}))}exec(){this.commands.forEach((t=>this.execChildCommand(t)))}undo(){this.commands.forEach((t=>this.undoChildCommand(t)))}}class M extends t{constructor(t){super(),this.type="Tribute Summon",this.data=t,this.data.position=this.data.position||"faceup-attack",this.commands=[],this.data.tributes.forEach((t=>{this.commands.push(new c({id:t.id,originZone:t.zone,player:this.data.player}))})),this.commands.push(new o({player:this.data.player,type:this.type,id:this.data.id,originZone:this.data.originZone,zone:this.data.zone,position:this.data.position}))}exec(){this.commands.forEach((t=>this.execChildCommand(t)))}undo(){this.commands.forEach((t=>this.undoChildCommand(t)))}}class Y extends t{constructor(t){super(),this.type="XYZ Attach Material",this.data=t}exec(){const t=this.YGO.state.getCardFromZone(this.data.zone);this.materialCardReference=this.YGO.state.getCardById(this.data.id,this.data.originZone),this.YGO.state.setCard(null,this.data.originZone),t.materials.push(this.materialCardReference),console.log("TCL:: EXEC ATTACH:: ",this.materialCardReference.name,this.data.originZone);const a=n.getOverlayZone(this.data.zone);this.YGO.duelLog.dispatch({player:this.data.player,commandId:this.getCommandId(),type:e.LogType.XYZSummon,id:this.data.id,originZone:this.data.originZone,overlayZone:a})}undo(){const t=this.YGO.state.getCardFromZone(this.data.zone);this.YGO.state.setCard(this.materialCardReference,this.data.originZone),t.materials.splice(t.materials.indexOf(this.materialCardReference),1)}}class T extends t{constructor(t){super(),this.type="XYZ Detach Material",this.data=t}exec(){const t=this.YGO.state.getCardFromZone(this.data.zone);this.materialCardReference=t.materials[this.data.materialIndex],t.materials.splice(this.data.materialIndex,1),this.YGO.state.setCard(this.materialCardReference,"GY");const a=n.getOverlayZone(this.data.zone);this.YGO.duelLog.dispatch({player:this.data.player,commandId:this.getCommandId(),type:e.LogType.XYZDetachMaterial,id:t.id,materialIndex:this.data.materialIndex,overlayZone:a})}undo(){const t=this.YGO.state.getCardFromZone(this.data.zone);t.materials.splice(t.materials.indexOf(this.materialCardReference),1),this.YGO.state.setCard(null,"GY")}}class z extends t{constructor(t){super(),this.type="XYZ Summon",this.data=t,this.data.position=this.data.position||"faceup-attack",this.commands=[],this.overlayZone=n.getOverlayZone(this.data.zone),this.data.materials.forEach((t=>{this.commands.push(new S({player:this.data.player,overlayZone:this.overlayZone,id:t.id,zone:t.zone}))})),this.commands.push(new o({player:this.data.player,type:this.type,id:this.data.id,originZone:this.data.originZone,zone:this.data.zone,position:this.data.position,log:!1}))}exec(){this.YGO.state.getCardById(this.data.id,this.data.originZone).materials=this.data.materials.map((t=>this.YGO.state.getCardById(t.id,t.zone))),this.execMultipleChildCommand(this.commands),this.YGO.duelLog.dispatch({player:this.data.player,commandId:this.getCommandId(),type:e.LogType.XYZDetachMaterial,id:this.data.id,originZone:this.data.originZone,zone:this.data.zone,position:this.data.position,materials:this.data.materials})}undo(){this.YGO.state.getCardById(this.data.id,this.data.zone).materials=[],this.undoMultipleChildCommand(this.commands)}}class S extends t{constructor(t){super(),this.data=t}exec(){this.card=this.YGO.state.getCardById(this.data.id,this.data.zone),this.YGO.state.setCard(null,this.data.zone),this.YGO.duelLog.dispatch({player:this.data.player,commandId:this.getCommandId(),type:e.LogType.XYZOverlay,id:this.data.id,originZone:this.data.zone,overlayZone:this.data.overlayZone})}undo(){this.YGO.state.setCard(this.card,this.data.zone)}}const I={NormalSummonCommand:C,SetMonsterCommand:y,SetCardCommand:g,SendCardToGYCommand:c,BanishCommand:d,DrawFromDeckCommand:h,MillFromDeckCommand:u,ActivateCardCommand:s,SpecialSummonCommand:Z,TributeSummonCommand:M,TributeSetCommand:k,LinkSummonCommand:p,XYZSummonCommand:z,XYZAttachMaterialCommand:Y,XYZDetachMaterialCommand:T,ToDeckCommand:x,ShuffleDeckCommand:f,DestroyCardCommand:r,RevealCommand:l,ToExtraDeckCommand:D,ToHandCommand:v,FieldSpellCommand:m},O={NormalSummonCommand:C,SetMonsterCommand:y,SetCardCommand:g,SendCardToGYCommand:c,BanishCommand:d,DrawFromDeckCommand:h,MillFromDeckCommand:u,ActivateCardCommand:s,SpecialSummonCommand:Z,TributeSummonCommand:M,TributeSetCommand:k,LinkSummonCommand:p,XYZSummonCommand:z,XYZAttachMaterialCommand:Y,XYZDetachMaterialCommand:T,ToDeckCommand:x,ShuffleDeckCommand:f,DestroyCardCommand:r,RevealCommand:l,ToExtraDeckCommand:D,ToHandCommand:v,FieldSpellCommand:m};class G{constructor(){this.events=new Map}on(t,e){this.events.has(t)||this.events.set(t,[]),this.events.get(t).push(e)}dispatch(t,...e){const a=this.events.get(t);a&&a.forEach((t=>t(...e)))}off(t,e){const a=this.events.get(t);a&&this.events.set(t,a.filter((t=>t!==e)))}clear(t){this.events.has(t)&&this.events.delete(t)}clearAll(){this.events.clear()}}class F{constructor(){this.logs=[],this.events=new G}dispatch(t){this.logs.push(t),this.events.dispatch("new-log",t),this.onLogsUpdated()}peek(){return 0==this.logs.length?null:this.logs[this.logs.length-1]}peekCommand(){return 0==this.logs.length?-1:this.logs[this.logs.length-1].commandId}pop(){return 0===this.logs.length?null:this.logs.pop()}removeCommand(t,e){for(let e=this.logs.length-1;e>=0&&this.logs[e].commandId===t.commandId;--e)this.logs.splice(e,1);!1!==(null==e?void 0:e.log)&&this.events.dispatch("update-logs",this.logs)}onLogsUpdated(){this.events.dispatch("update-logs",this.logs)}}class w{constructor(t){this.fields=n.initializePlayersFields(t),this.cardsInGame=n.getCardsInGame(this.fields)}getCardById(t,e){const a=e.includes("2-")?1:0;if("GY"===e||"GY2"===e){const s=this.fields[a].graveyard.find((e=>e.id===t));if(!s)throw new Error(`card "${t}" not found in "${e}"`);return s}const s=this.getCardFromZone(e);if(s&&s.id===t)return s;throw new Error(`card "${t}" not found in "${e}"`)}getCardFromZone(t){const e=t.includes("2-")?1:0;if(t.startsWith("H-")||t.startsWith("H2-")){const a=Number(t.split("-").pop())-1;return this.fields[e].hand[a]}if(t.startsWith("M-")||t.startsWith("M2-")){const a=Number(t.split("-").pop())-1;return this.fields[e].monsterZone[a]}if(t.startsWith("S-")||t.startsWith("S2-")){const a=Number(t.split("-").pop())-1;return this.fields[e].spellTrapZone[a]}if(t.startsWith("GY-")||t.startsWith("GY2-")){const a=Number(t.split("-").pop())-1;return this.fields[e].graveyard[a]}if(t.startsWith("B-")||t.startsWith("B2-")){const a=Number(t.split("-").pop())-1;return this.fields[e].banishedZone[a]}if(t.startsWith("D-")||t.startsWith("D2-")){const a=Number(t.split("-").pop())-1;return this.fields[e].mainDeck[a]}if(t.startsWith("ED-")||t.startsWith("ED2-")){const a=Number(t.split("-").pop())-1;return this.fields[e].extraDeck[a]}if(t.startsWith("EMZ-")||t.startsWith("EMZ2-")){const a=Number(t.split("-").pop())-1;return this.fields[e].extraMonsterZone[a]}if(t.startsWith("F")||t.startsWith("F2")){return this.fields[e].fieldZone}return null}moveCardById(t,e,a){const s=this.getCardById(t,e);this.moveCard(s,e,a)}moveCard(t,e,a){this.removeCard(e),this.setCard(t,a)}setCard(t,e){const a=e.includes("2-")?1:0;if(e.startsWith("H-")||e.startsWith("H2-")||"H"===e||"H2"===e){const s=e.includes("-")?Number(e.split("-").pop())-1:-1,i=this.fields[a].hand;-1==s&&t?i.push(t):t?s>=i.length?i.push(t):i.splice(s,0,t):i.splice(s,1)}else if(e.startsWith("M-")||e.startsWith("M2-")){const s=Number(e.split("-").pop())-1;this.fields[a].monsterZone[s]=t}else if(e.startsWith("S-")||e.startsWith("S2-")){const s=Number(e.split("-").pop())-1;this.fields[a].spellTrapZone[s]=t}else if(e.startsWith("EMZ-")||e.startsWith("EMZ2-")){const s=Number(e.split("-").pop())-1;this.fields[a].extraMonsterZone[s]=t}else if(e.startsWith("ED")||e.startsWith("ED2"))if(-1!==e.indexOf("-")){const s=Number(e.split("-").pop())-1;t?this.fields[a].extraDeck.splice(s,0,t):this.fields[a].extraDeck.splice(s,1)}else{if(!t)throw new Error("No card to add to Extra Deck");{const e=t.isMainDeckCard&&i.isPendulumCard(t),s=this.fields[a].extraDeck;if(e)s.unshift(t);else{const e=i.getCardBaseType(t),a=s.findIndex((a=>{const s=i.getCardBaseType(a);return e<s||e===s&&t.name<a.name}));-1!==a?s.splice(a,0,t):s.push(t)}}}else if(e.startsWith("D-")||e.startsWith("D2-")){const s=Number(e.split("-").pop())-1;console.log("MOVE CARD TO DECK ",e),t?this.fields[a].mainDeck.splice(s,0,t):this.fields[a].mainDeck.splice(s,1)}else if("GY"===e||"GY2"===e||e.startsWith("GY-")||e.startsWith("GY2-")){const s=e.includes("-")?Number(e.split("-").pop())-1:-1,i=this.fields[a].graveyard;t?-1===s?i.unshift(t):i.splice(s,0,t):-1==s?i.pop():i.splice(s,1)}else if("B"===e||"B2"===e||e.startsWith("B-")||e.startsWith("B2-")){const s=e.includes("-")?Number(e.split("-").pop())-1:-1,i=this.fields[a].banishedZone;t?-1===s?i.unshift(t):i.splice(s,0,t):-1==s?i.pop():i.splice(s,1)}else(e.startsWith("F")||e.startsWith("F2"))&&(this.fields[a].fieldZone=t)}removeCard(t){const e=this.getCardFromZone(t);return this.setCard(null,t),e}getCardData(t){return this.cardsInGame.get(t)||null}shuffleDeck(t){const e=this.fields[t].mainDeck;if(0!==e.length)for(let t=e.length-1;t>0;t--){const a=Math.floor(Math.random()*(t+1));[e[t],e[a]]=[e[a],e[t]]}}getPlayerIndexFromZone(t){return n.getPlayerIndexFromZone(t)}getAvailableZones(t){const e=[];for(const a of t){const t=this.getPlayerIndexFromZone(a),s=this.fields[t];if("M"===a)s.monsterZone.forEach(((a,s)=>{const i=`M${0===t?"":"2"}-${s+1}`;a||e.push(i)}));else if("S"===a)s.spellTrapZone.forEach(((a,s)=>{const i=`S${0===t?"":"2"}-${s+1}`;a||e.push(i)}));else if("EMZ"===a)for(let t=0;t<2;++t){const a=`EMZ-${t+1}`;s.extraDeck[t]||s.extraDeck[t]||e.push(a)}else"F"===a&&s.fieldZone&&e.push("F")}return e}}class E{static createReplayData(t){const e=t.props.players.map(((e,a)=>({name:e.name,deck:e.mainDeck.map((t=>t.id)),mainDeckOrder:t.getField(a).initialMainDeckOrder,extraDeck:e.mainDeck.map((t=>t.id))}))),a=t.commands.map((t=>t.toJSON())),s=[];for(let e=0;e<t.state.fields.length;++e){const a=[],n=t.getField(e);for(let t=0;t<n.monsterZone.length;++t)if(n.monsterZone[t]){const s=n.monsterZone[t],o=i.createZone("M",e,t+1);a.push(this.getMonsterCardInfo(s,o))}for(let t=0;t<n.spellTrapZone.length;++t)if(n.spellTrapZone[t]){const s=n.spellTrapZone[t],o=i.createZone("S",e,t+1);a.push({id:s.id,zone:o})}for(let t=0;t<n.extraMonsterZone.length;++t)if(n.extraMonsterZone[t]){const s=n.extraMonsterZone[t],o=i.createZone("EMZ",e,t+1);a.push(this.getMonsterCardInfo(s,o))}for(let t=0;t<n.graveyard.length;++t){const s=n.graveyard[t],o=i.createZone("GY",e);a.push({id:s.id,zone:o})}for(let t=0;t<n.banishedZone.length;++t){const s=n.banishedZone[t],o=i.createZone("B",e),d={id:s.id,zone:o};i.isFaceDown(s)&&(d.position="facedown"),a.push(d)}s.push(a)}return{players:e,commands:a,endField:s}}static getMonsterCardInfo(t,e){const a={id:t.id,zone:e};return t.atk!==t.currentAtk&&(a.atk=t.currentAtk),t.def!=t.def&&(a.atk=t.currentAtk),"faceup-attack"!==t.position&&(a.position=t.position),t.materials.length>0&&(a.materials=t.materials.map((t=>t.id))),a}}class L{constructor(t){this.commandIndex=-1,this.props=t,this.state=new w(t),this.duelLog=new F,this.events=new G,this.commands=this.createYGOCommands(t.commands),this.commandId=0}start(){0===this.commands.length&&this.props.players.forEach(((t,e)=>{const a=this.getField(e),s=a.initialHandSize;s>0&&0===a.hand.length&&this.exec(new I.DrawFromDeckCommand({player:e,numberOfCards:s}))}))}exec(t){return this.hasNextCommand()&&this.commands.splice(this.commandIndex+1,this.commands.length-this.commandIndex),this.commandIndex=this.commands.length,this.commands.push(t),t.init(this),t.exec(),t}peek(){return this.commands.length>0?this.commands[this.commands.length-1]:null}redo(){if(!this.hasNextCommand())return null;this.commandIndex++;const t=this.commands[this.commandIndex];return t.exec(),this.duelLog.onLogsUpdated(),t}undo(){if(!this.hasPrevCommand())return null;const t=this.commands[this.commandIndex];return this.duelLog.removeCommand(t),t.undo(),this.commandIndex--,this.duelLog.onLogsUpdated(),t}goToCommand(t){const e=this.commands.findIndex((e=>e===t));if(-1===e)return!1;if(e===this.commandIndex)return!0;if(e>this.commandIndex){for(;this.commandIndex!==e&&this.hasNextCommand();)this.redo();return!0}for(;this.commandIndex!==e&&this.hasPrevCommand();)this.undo();return!0}hasNextCommand(){return this.commands.length-1>this.commandIndex}hasPrevCommand(){return this.commandIndex>=0}getNextCommandId(){return++this.commandId}getReplayData(){for(;this.hasNextCommand();)this.redo();return E.createReplayData(this)}getField(t){return this.state.fields[t]}createYGOCommands(t){if(Array.isArray(t)){return t.map((t=>{const e=(a=t.type,O[a]);var a;if(!e)throw new Error(`Command "${t.type}" dont exists!`);const s=new e(t.data);return s.init(this),s}))}return[]}}const b=I;export{b as YGOCommands,L as YGOCore,e as YGODuelEvents,F as YGODuelLog,i as YGOGameUtils};
//# sourceMappingURL=index.js.map
