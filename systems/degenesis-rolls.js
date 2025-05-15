import { BaseRolls } from "./base-rolls.js"
import { i18n, MonksTokenBar, log, setting } from "../monks-tokenbar.js"
import { SavingThrowApp } from "../apps/savingthrow.js";
import { ContestedRollApp } from "../apps/contestedroll.js";

class DegeesisContestedRollApp extends ContestedRollApp {
    constructor(options = {}) {
        super(options);

        this.tokenOneSkills;
        this.tokenTwoSkills;
        this.tokenOneType;
        this.tokenTwoType;
    }

    activateListeners(html) {
    super.activateListeners(html);

    const requestRolls = html.find(".request-roll");
    requestRolls.css("color", "red");

    this.tokenOneSkills = requestRolls.eq(0).find("optgroup").not('[label="DICE"]')
    this.tokenTwoSkills = requestRolls.eq(1).find("optgroup").not('[label="DICE"]')
  }

    getData(options = {}) {
        const data = super.getData(options);

        if (data.entries.length >= 1) {
            this.tokenOneType = data.entries[0].token.actor.type;
        }

        if (data.entries.length >= 2) {
            this.tokenTwoType = data.entries[1].token.actor.type;
        }
    
        return data;
    }

    async _render(...args) {
        await super._render(...args);

        this.tokenOneSkills.css("display", (this.tokenOneType === "fromhell")? "none" : "block");
        this.tokenTwoSkills.css("display", (this.tokenTwoType === "fromhell")? "none" : "block");
    }
}

export class DegenesisRolls extends BaseRolls {
    constructor() {
        super();

        this._config = CONFIG[game.system.id.toUpperCase()];

        const skills = Object.entries(game.system.template.Actor.character.skills).reduce((acc, [key, value]) => {
            if (! acc[value.attribute]) {
                acc[value.attribute] = {};
            }
            acc[value.attribute][key] = key.toUpperCase();

            return acc;
        }, {});

        const skillRequestOptions = Object.keys(skills).map((key) => {
            return { id: 'skill', text: key.toLocaleUpperCase(), groups: skills[key] };
        })

        const dice = Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`${i+1}d6`, `${i+1}d6`]));

        this._requestoptions = [
            { id: "dice", text: "DICE", cssclass: "dice-group", groups: dice },
            ...skillRequestOptions
        ];
    }

    get _supportedSystem() {
        return true;
    }

    rollSuccess(roll, dc, actorId, request) {
        let passed = roll?.total >= dc;
        return { passed };
    }

    getButtons() {
        var buttons = [];
        if (setting("show-movement")) {
            buttons.push([
                {
                    id: 'movement-free',
                    title: 'MonksTokenBar.FreeMovement',
                    icon: 'fa-running',
                    click: (game.user.isGM ?
                        (event) => {
                            event.preventDefault();
                            MonksTokenBar.changeGlobalMovement('free');
                        } : null)
                },
                {
                    id: 'movement-none',
                    title: 'MonksTokenBar.NoMovement',
                    icon: 'fa-street-view',
                    click: (game.user.isGM ?
                        (event) => {
                            event.preventDefault();
                            MonksTokenBar.changeGlobalMovement('none');
                        } : null)
                },
                {
                    id: 'movement-combat',
                    title: 'MonksTokenBar.CombatTurn',
                    icon: 'fa-fist-raised',
                    click: (game.user.isGM ? (event) => {
                        event.preventDefault();
                        MonksTokenBar.changeGlobalMovement('combat');
                    } : null)
                }
            ]);
        }
        if (game.user.isGM && MonksTokenBar.system._supportedSystem) {
            buttons.push([
                {
                    id: 'request-roll',
                    title: 'MonksTokenBar.RequestRoll',
                    icon: 'fa-tools',
                    click: (event) => {
                        event.preventDefault();
                        this.savingthrow = new SavingThrowApp().render(true);
                    }
                },
                {
                    id: 'contested-roll',
                    title: 'MonksTokenBar.ContestedRoll',
                    icon: 'fa-people-arrows',
                    click: (event) => {
                        event.preventDefault();
                        this.contestedroll = new DegeesisContestedRollApp().render(true);
                    }
                }
            ]);
        }
        return buttons;
    }

    roll({ id, actor, request, rollMode, fastForward = false }, callback, e) {
        let rollfn = null;
        let options = {}
        let context = actor;

        if (request.type == 'skill') {
            rollfn = actor.rollSkill;
        }

        if (rollfn != undefined) {
            try {
                return rollfn.call(context, request.key, options).then((roll) => { return callback(roll); }).catch(() => { return { id: id, error: true, msg: i18n("MonksTokenBar.UnknownError") } });
            } catch{
                return { id: id, error: true, msg: i18n("MonksTokenBar.UnknownError") }
            }
        } else
            return { id: id, error: true, msg: i18n("MonksTokenBar.ActorNoRollFunction")
        };
    }
}