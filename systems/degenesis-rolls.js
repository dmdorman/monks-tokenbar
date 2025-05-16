import { BaseRolls } from "./base-rolls.js"
import { i18n, MonksTokenBar, log, setting } from "../monks-tokenbar.js"
import { SavingThrowApp } from "../apps/savingthrow.js";
import { ContestedRollApp } from "../apps/contestedroll.js";

// var opts = { skipDialog : false, skipDialog : true, rollDataOverride : { secondary : 'force', difficulty: 1, secondaryrollDataOverride: { difficulty : 5 } }}
// game.actors.get("TlDcrTv9P10nCTWv").rollSkill('brawl', opts)

class DegesisSavingThrowApp extends SavingThrowApp {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "requestsavingthrow",
            title: i18n("MonksTokenBar.RequestRoll"),
            template: "./modules/monks-tokenbar/templates/savingthrow.html",
            width: 1000,
            popOut: true
        });
    }

    activateListeners(html) {
        super.activateListeners(html);

        const requestRollsPrimary = html.find(".request-roll").first();
        const requestRollsSecondary = requestRollsPrimary.clone();

        const wrapper = '<div class="flexcol"></div>'
        requestRollsPrimary.wrap(wrapper);
        requestRollsSecondary.wrap(wrapper)

        const getHeader = (stringType) => {
            return `
                <div class="flexrow" style="padding-right:8px;">
                    <label style="margin-left: 16px; flex: 0 0 50px;">${stringType}</label>
                    <label style="margin-left: 16px; flex: 0 0 50px;">DC</label>
                    <input type="number" step="any" id="monks-tokenbar-savingdc" value="{{dc}}" style="flex: 0 0 50px;text-align:right;" />
                </div>
            `;
        }

        const primaryHeader = getHeader("PRIMARY ROLL")
        const secondaryHeader = getHeader("SECONDARY ROLL")

        const wrapperStyle = {
            "border": "1px solid var(--c-gold)"
        }
        const primaryWrapper = requestRollsPrimary.parent();
        primaryWrapper.css(wrapperStyle)

        const secondaryWrapper = requestRollsSecondary.parent();
        primaryWrapper.after(secondaryWrapper);

        requestRollsPrimary.before(primaryHeader)
        requestRollsSecondary.before(secondaryHeader)

        const skillOptions = html.find(".request-option");
        
        skillOptions.css({
            "color": "var(--c-gold-4)",
            "font-size": "0.8em",
        });
    }

    getData(options) {
        var data = super.getData(options);
        data.options = data.options.filter((e) => e.id !== 'dice')
        return data;
    }

    async requestRoll(roll, evt) {
        super.requestRoll(roll, evt);
    }
}

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
        requestRolls.css("color", "var(--c-dgns-red)");

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
                        this.savingthrow = new DegesisSavingThrowApp().render(true);
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