import { BaseRolls } from "./base-rolls.js"
import { i18n, MonksTokenBar, log, setting } from "../monks-tokenbar.js"
import { SavingThrowApp } from "../apps/savingthrow.js";
import { ContestedRollApp } from "../apps/contestedroll.js";
import { AssignXPApp } from "../apps/assignxp.js";

class DegeesisContestedRollApp extends ContestedRollApp {
  activateListeners(html) {
    super.activateListeners(html);

    html.find(".request-roll").css("color", "red");
    html.find(".request-roll label").attr("style", "color: green !important;");
  }
}



export class DegenesisRolls extends BaseRolls {
    constructor() {
        super();

        this._config = CONFIG[game.system.id.toUpperCase()];

        const skills = Object.entries(game.system.template.Actor.character.skills).reduce((acc, [key, _]) => {
            acc[key] = key.toUpperCase();
            return acc;
        }, {});

        const dice = Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`${i+1}d6`, `${i+1}d6`]));

        this._requestoptions = [
            { id: "dice", text: "Dice", cssclass: "dice-group", groups: dice },
            { id: "skill", text: i18n("MonksTokenBar.Skill"), groups: skills }
        ];
    }

    get _supportedSystem() {
        return true;
    }

    getValue(actor, type, key) {
        return null;
    }

    rollProperties(request) {
        return [];
    }

    isCritical(roll) {
        if (!(roll.terms[0] instanceof foundry.dice.terms.Die) && (roll.terms[0].faces === 20) || !roll._evaluated) return undefined;
        if (Number.isNumeric(roll.options.critical) && roll.dice[0].total >= roll.options.critical) return 'critical';
        if (Number.isNumeric(roll.options.fumble) && roll.dice[0].total <= roll.options.fumble) return 'fumble';
        return false;
    }

    static activateHooks() {
    }

    get requestoptions() {
        return this._requestoptions;
    }

    get contestedoptions() {
        return this._requestoptions.filter(o => { return o.id != 'save' && o.id != 'misc' });
    }

    get config() {
        return this._config;
    }

    get canReroll() {
        return true;
    }

    get showRoll() {
        return true;
    }

    get useDegrees() {
        return false;
    }

    get hasCritical() {
        return false;
    }

    rollSuccess(roll, dc, actorId, request) {
        let passed = roll?.total >= dc;
        return { passed };
    }

    get showXP() {
        return false;
    }

    calcXP(actors, monsters) {
        return 0;
    }

    getXP (actor) {
        return { value: 0, max: 0 };
    }

    getLevel(actor) {
        return actor.system.details?.level?.value ?? actor.system.details?.level ?? 0;
    }

    get dcLabel() {
        return "MonksTokenBar.SavingDC";
    }

    get defaultStats() {
        return [];
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

    defaultRequest() {
        return null;
    }

    defaultContested() {
        return null;
    }

    get canGrab() {
        return false;
    }

    get showAdvantage() {
        return false;
    }

    dynamicRequest(tokens) {
        return [];
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