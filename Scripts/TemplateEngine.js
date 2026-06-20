/**
 * TemplateEngine.js — v1.0 通用模板引擎
 * 公式评估 / 条件判定 / 伤害管道 / 状态引擎 / 意图执行 / 被动引擎 / 掉落引擎
 */
window.TemplateEngine = (function () {
    'use strict';
    var GD = function () { return window.GameData; };
    var GS = function () { return window.GameState.getState(); };

    // ===== 公式评估器 =====
    function evaluateFormula(formulaStr, context) {
        if (typeof formulaStr === 'number') return formulaStr;
        if (!formulaStr || typeof formulaStr !== 'string') return 0;
        try {
            var keys = Object.keys(context);
            var fn = new Function('{' + keys.join(',') + '}', 'Math',
                'var ceil=Math.ceil,floor=Math.floor,max=Math.max,min=Math.min,round=Math.round,random=Math.random,abs=Math.abs; return (' + formulaStr + ');');
            return fn(context, Math);
        } catch (e) { console.warn('[TE] Formula eval failed:', formulaStr, e); return 0; }
    }

    function evaluateCondition(condition, context) {
        if (typeof condition === 'boolean') return condition;
        if (typeof condition === 'function') return condition(context);
        if (!condition || typeof condition !== 'string') return true;
        try {
            var keys = Object.keys(context);
            var fn = new Function('{' + keys.join(',') + '}', 'return (' + condition + ');');
            return !!fn(context);
        } catch (e) { console.warn('[TE] Condition eval failed:', condition, e); return false; }
    }

    // ===== ModifierStack =====
    function ModifierStack(base) { this._base = base; this._mods = []; }
    ModifierStack.prototype.add = function (type, value, source, priority) {
        if (value === 0 || value === undefined || value === null) return this;
        this._mods.push({ type: type, value: value, source: source || '?', priority: priority || (type === 'flat' ? 10 : type === 'pct' ? 20 : 30) });
        return this;
    };
    ModifierStack.prototype.resolve = function () {
        var result = this._base;
        this._mods.sort(function (a, b) { return a.priority - b.priority; });
        var flatSum = 0, pctSum = 0, mulProduct = 1;
        for (var i = 0; i < this._mods.length; i++) {
            var m = this._mods[i];
            if (m.type === 'flat') flatSum += m.value;
            else if (m.type === 'pct') pctSum += m.value;
            else if (m.type === 'mul') mulProduct *= m.value;
        }
        result = (result + flatSum) * (1 + pctSum) * mulProduct;
        return Math.max(0, Math.ceil(result));
    };
    ModifierStack.prototype.listSources = function () { return this._mods.map(function (m) { return { source: m.source, type: m.type, value: m.value }; }); };

    // ===== DamagePipeline =====
    var DamagePipeline = {
        calculate: function (ctx) {
            ctx = ctx || {};
            var stack = new ModifierStack(ctx.baseAtk || 0);
            var targetMon = ctx.targetMon || {}, targetData = ctx.targetData || {};
            var compFx = ctx.compEffects || {}, slot = ctx.slot || 'predatory_organ';
            var ignoreDef = false;
            if (ctx.researchLvl >= 2) stack.add('pct', 0.1, '研究Lv.2', 5);
            if (ctx.tierFactor && ctx.tierFactor !== 1) stack.add('mul', ctx.tierFactor, '器官阶位', 10);
            if (ctx.isCounter) { var cb = (GD().STATUS_CONSTANTS && GD().STATUS_CONSTANTS.counterBonus) || 0.5; stack.add('pct', cb, '种族克制', 15); }
            if (ctx.coatingMultiplier && ctx.coatingMultiplier !== 1) stack.add('mul', ctx.coatingMultiplier, '基因涂层', 20);
            if (ctx.coatingIgnoreDef) ignoreDef = true;
            if (ctx.coatingShieldStrip) targetMon._shield = Math.max(0, (targetMon._shield || 0) - ctx.coatingShieldStrip);
            if (ctx.organMultiplier && ctx.organMultiplier !== 1) stack.add('mul', ctx.organMultiplier, 'Boss器官倍率', 25);
            if (ctx.organIgnoreDef) ignoreDef = true;
            if (ctx.dualMultiplier && ctx.dualMultiplier !== 1) stack.add('mul', ctx.dualMultiplier, '双专精被动', 30);
            if (ctx.dualIgnoreDef) ignoreDef = true;
            if (compFx.bonusVsSwarm > 0 && targetData.race === 'swarm') stack.add('pct', compFx.bonusVsSwarm, '组件:种族增伤', 35);
            if (targetMon._vulnerable) stack.add('pct', 0.5, '易伤', 40);
            var rawDamage = stack.resolve();
            if (slot === 'predatory_organ' && targetData.physicalResist && !ignoreDef) rawDamage = Math.ceil(rawDamage * (1 - targetData.physicalResist));
            var defenseReduction = 0;
            if (!ignoreDef) {
                var effDef = (targetMon.def || targetData.def || 0) + (targetMon._defBuff || 0);
                if (compFx.armorPen > 0) effDef = Math.max(0, effDef * (1 - compFx.armorPen));
                if (effDef > 0 && window.GameState && window.GameState.calcDamageReduction) {
                    var reduction = window.GameState.calcDamageReduction(effDef);
                    defenseReduction = Math.ceil(rawDamage * reduction);
                    rawDamage -= defenseReduction;
                }
            }
            var wasCrit = false;
            if (compFx.critChance > 0 && Math.random() < compFx.critChance) { rawDamage = Math.ceil(rawDamage * (compFx.critMultiplier || 1.5)); wasCrit = true; }
            return { damage: Math.max(0, rawDamage), ignoreDef: ignoreDef, defenseReduction: defenseReduction, wasCrit: wasCrit, breakdown: stack.listSources() };
        },
        forecast: function (ctx) { var r = this.calculate(ctx); return { damage: r.damage, ignoreDef: r.ignoreDef }; }
    };

    // ===== StatusEngine =====
    var StatusEngine = {
        _templates: {},
        register: function (templates) { var s = this; Object.keys(templates).forEach(function (k) { s._templates[k] = templates[k]; }); },
        getTemplate: function (statusId) { return this._templates[statusId] || null; },
        apply: function (statusId, target, params, battleState) {
            var tpl = this._templates[statusId]; if (!tpl) return null;
            params = params || {};
            var duration = params.duration || 3;
            var existing = target.status[statusId] || 0;
            if (tpl.stackable) target.status[statusId] = Math.min(existing + duration, tpl.maxStacks || 9);
            else target.status[statusId] = Math.max(existing, duration);
            if (params.damage) target['_' + statusId + 'Damage'] = params.damage;
            if (tpl.hooks && tpl.hooks.onApply) {
                var effs = tpl.hooks.onApply.effects || [tpl.hooks.onApply];
                this._executeEffects(effs, { target: target, battleState: battleState, params: params });
            }
            return { msg: (tpl.name || statusId) + ' (' + target.status[statusId] + '回合)', color: tpl.color };
        },
        tickTurnStart: function (targets) {
            var logs = [], self = this;
            targets.forEach(function (entry) {
                var target = entry.target;
                Object.keys(target.status || {}).forEach(function (sid) {
                    var tpl = self._templates[sid]; if (!tpl || !tpl.hooks || !tpl.hooks.onTurnStart) return;
                    if (target.status[sid] <= 0) return;
                    var hook = tpl.hooks.onTurnStart;
                    var ctx = { target: target, battleState: entry.battleState, hpMax: target.hpMax || target.hp || 100,
                        dotBonus: entry.dotBonus || 0, statusDamage: target['_' + sid + 'Damage'] || 0,
                        bleedDmg: entry.bleedDmg || 4, dotPct: entry.dotPct || 0.05, playerHpMax: entry.playerHpMax || 100 };
                    if (hook.type === 'dot') {
                        var dmg = evaluateFormula(hook.formula, ctx);
                        if (dmg > 0) { target.hp = Math.max(0, (target.hp || 0) - dmg); logs.push({ msg: (tpl.name || sid) + '造成 ' + dmg + ' 伤害', color: tpl.color }); }
                    } else if (hook.effects) { self._executeEffects(hook.effects, ctx); }
                });
            });
            return logs;
        },
        tickTurnEnd: function (targets) {
            var logs = [], self = this;
            targets.forEach(function (entry) {
                var target = entry.target;
                Object.keys(target.status || {}).forEach(function (sid) {
                    if (target.status[sid] <= 0) return;
                    target.status[sid]--;
                    if (target.status[sid] <= 0) {
                        var tpl = self._templates[sid];
                        if (tpl && tpl.hooks && tpl.hooks.onExpire) {
                            var hook = tpl.hooks.onExpire;
                            if (hook.msg) logs.push({ msg: hook.msg, color: tpl.color || 'var(--text-dim)' });
                            if (hook.effects) self._executeEffects(hook.effects, { target: target });
                        }
                    }
                });
            });
            return logs;
        },
        getActive: function (target) {
            var active = [], self = this;
            Object.keys(target.status || {}).forEach(function (sid) {
                if (target.status[sid] > 0) {
                    var tpl = self._templates[sid];
                    if (tpl) active.push({ id: sid, name: tpl.name || sid, icon: tpl.icon || '', color: tpl.color || 'var(--text-dim)', duration: target.status[sid], tooltip: tpl.tooltip || '' });
                }
            });
            return active;
        },
        _executeEffects: function (effects, ctx) {
            effects.forEach(function (eff) {
                if (eff.type === 'statMod') Object.keys(eff.params || {}).forEach(function (k) { ctx.target[k] = eff.params[k]; });
                else if (eff.type === 'setFlag') {
                    var tgt = eff.target === 'allEnemies' ? ctx.battleState.allTargets : ctx.target;
                    if (tgt) {
                        if (Array.isArray(tgt)) tgt.forEach(function (t) { t[eff.flag] = eff.value; });
                        else tgt[eff.flag] = eff.value;
                    }
                }
            });
        }
    };

    // ===== IntentExecutor =====
    var IntentExecutor = {
        _handlers: {},
        register: function (handlers) { var s = this; Object.keys(handlers).forEach(function (k) { s._handlers[k] = handlers[k]; }); },
        execute: function (monster, battleState, player, idx) {
            var intent = monster.intent; if (!intent) return { type: 'none' };
            var handler = this._handlers[intent.type || 'physical'];
            if (handler && handler.execute) return handler.execute(monster, intent, battleState, player, idx);
            return this._handlers['physical'] ? this._handlers['physical'].execute(monster, intent, battleState, player, idx) : { type: 'none' };
        },
        generate: function (monsterData, battleState) {
            if (!monsterData || !monsterData.intents) return null;
            var avail = [];
            for (var i = 0; i < monsterData.intents.length; i++) {
                var it = monsterData.intents[i];
                if (it.triggerTurn && battleState.turn < it.triggerTurn) continue;
                avail.push(it);
            }
            if (avail.length === 0) avail = monsterData.intents;
            var sel = avail[Math.floor(Math.random() * avail.length)];
            var r = {}; Object.keys(sel).forEach(function (k) { r[k] = sel[k]; }); return r;
        }
    };

    // ===== PassiveEngine =====
    var PassiveEngine = {
        _passives: [],
        register: function (passives) {
            var self = this;
            if (Array.isArray(passives)) self._passives = self._passives.concat(passives);
            else Object.keys(passives).forEach(function (k) { self._passives.push(passives[k]); });
        },
        clear: function () { this._passives = []; },
        trigger: function (eventName, ctx) {
            var results = [];
            for (var i = 0; i < this._passives.length; i++) {
                var p = this._passives[i]; if (!p.triggers) continue;
                for (var j = 0; j < p.triggers.length; j++) {
                    var t = p.triggers[j]; if (t.on !== eventName) continue;
                    if (t.condition && !evaluateCondition(t.condition, ctx)) continue;
                    if (t.effects) for (var k = 0; k < t.effects.length; k++) results.push({ passiveId: p.id, passiveName: p.name, effect: t.effects[k], color: p.color });
                }
            }
            return results;
        },
        applyResults: function (results, ctx, battleState) {
            var logs = [];
            results.forEach(function (r) {
                var eff = r.effect;
                if (eff.type === 'multiplyDamage') { if (!ctx._passiveMul) ctx._passiveMul = 1; ctx._passiveMul *= eff.value; }
                else if (eff.type === 'setFlag') { ctx[eff.flag] = eff.value; }
                else if (eff.type === 'chainLightning') {
                    var dmg = evaluateFormula(eff.formula, ctx);
                    var targets = ctx.allEnemies || (ctx.target ? [ctx.target] : []);
                    var count = Math.min(eff.count || 2, targets.length);
                    for (var c = 0; c < count; c++) { var t = targets[Math.floor(Math.random() * targets.length)]; t.hp = Math.max(0, (t.hp || 0) - dmg); }
                    logs.push({ msg: '【' + r.passiveName + '】连锁闪电 ' + dmg + ' 伤害', color: r.color });
                } else if (eff.type === 'applyStatus') {
                    var st = eff.target === 'self' ? ctx.player : ctx.target;
                    if (st) { var sp = {}; if (eff.params) Object.keys(eff.params).forEach(function (k) { sp[k] = eff.params[k]; }); StatusEngine.apply(eff.status, st, sp, battleState); }
                } else if (eff.type === 'heal') { var ha = evaluateFormula(eff.formula, ctx); if (ctx.player) ctx.player.hp = Math.min(ctx.player.hp_max, (ctx.player.hp || 0) + ha); logs.push({ msg: '【' + r.passiveName + '】回复 ' + ha + ' HP', color: r.color }); }
                else if (eff.type === 'gainProcess') { var gp = evaluateFormula(eff.formula, ctx); battleState.playerProcess = Math.min((ctx.player && ctx.player.process_max) || 10, (battleState.playerProcess || 0) + gp); logs.push({ msg: '【' + r.passiveName + '】回复 ' + gp + ' 进程', color: r.color }); }
                else if (eff.type === 'gainShield') { var gs2 = evaluateFormula(eff.formula, ctx); battleState.shieldAmount = (battleState.shieldAmount || 0) + gs2; logs.push({ msg: '【' + r.passiveName + '】获得 ' + gs2 + ' 护盾', color: r.color }); }
            });
            return logs;
        }
    };

    // ===== LootEngine =====
    var LootEngine = {
        roll: function (table, ctx) {
            var rewards = [], logs = []; ctx = ctx || {};
            if (table.guaranteed) table.guaranteed.forEach(function (e) { var r = this._resolve(e, ctx); if (r) { rewards.push(r.reward); if (r.log) logs.push(r.log); } }.bind(this));
            if (table.rolls) table.rolls.forEach(function (e) {
                if (e.condition && !evaluateCondition(e.condition, ctx)) return;
                if (Math.random() < (e.weight !== undefined ? e.weight : 1.0)) { var r = this._resolve(e, ctx); if (r) { rewards.push(r.reward); if (r.log) logs.push(r.log); } }
            }.bind(this));
            return { rewards: rewards, logs: logs };
        },
        _resolve: function (entry, ctx) {
            var qty = 1;
            if (typeof entry.count === 'object') qty = (entry.count.min || 1) + Math.floor(Math.random() * ((entry.count.max || 1) - (entry.count.min || 0) + 1));
            else if (typeof entry.count === 'number') qty = entry.count;
            var val = 0;
            if (typeof entry.min === 'number' && typeof entry.max === 'number') val = entry.min + Math.floor(Math.random() * (entry.max - entry.min + 1));
            if (entry.item === 'bp') return { reward: { type: 'bp', quantity: val }, log: 'BP +' + val };
            if (entry.item === 'xp') return { reward: { type: 'xp', quantity: val }, log: '经验 +' + val };
            if (entry.item === 'randomComponent') { var comps = GD().COMPONENTS || {}; var names = Object.keys(comps); if (!names.length) return null; var cid = names[Math.floor(Math.random() * names.length)]; return { reward: { type: 'component', id: cid, quantity: qty }, log: cid + ' x' + qty }; }
            if (typeof entry.item === 'string') return { reward: { type: 'component', id: entry.item, quantity: qty }, log: entry.item + ' x' + qty };
            return null;
        }
    };

    // ===== TurnFlow =====
    var TurnFlow = {
        PHASES: { PLAYER: 'player_turn', MONSTER: 'monster_turn', VICTORY: 'victory', DEFEAT: 'defeat' },
        isPlayerTurn: function (bs) { return bs && bs.phase === this.PHASES.PLAYER; },
        isMonsterTurn: function (bs) { return bs && bs.phase === this.PHASES.MONSTER; },
        toMonsterTurn: function (bs) { bs.phase = this.PHASES.MONSTER; bs.turn++; return bs; },
        toPlayerTurn: function (bs) { bs.phase = this.PHASES.PLAYER; return bs; }
    };

    // ===== 辅助 =====
    function resolveByPath(obj, path) { if (!obj || !path) return undefined; var parts = path.split('.'), cur = obj; for (var i = 0; i < parts.length; i++) { if (cur === null || cur === undefined) return undefined; cur = cur[parts[i]]; } return cur; }
    function deepClone(obj) { if (!obj || typeof obj !== 'object') return obj; return JSON.parse(JSON.stringify(obj)); }

    // ===== UI 渲染模板 =====
    var UIRenderers = {
        // -- TagRenderer: 状态/种族/词缀标签 --
        renderTag: function(cfg) {
            cfg = cfg || {};
            var icon = cfg.icon ? '<span class="icon ' + cfg.icon + '"></span> ' : '';
            var tip = cfg.tooltip || cfg.text || '';
            var cls = cfg.cls || 'txt-xs help-tip';
            return '<span class="' + cls + '" style="padding:3px 8px;background:' + (cfg.bg || 'rgba(0,0,0,0.25)') + ';border:1px solid ' + (cfg.color || 'var(--text-dim)') + ';border-radius:4px;color:' + (cfg.color || 'var(--text-dim)') + ';font-size:11px;white-space:nowrap;margin:2px;" data-tip="' + tip.replace(/"/g, '&quot;') + '">' + icon + (cfg.text || '') + '</span>';
        },

        // -- BarRenderer: 进度条 --
        renderBar: function(cfg) {
            cfg = cfg || {};
            var w = cfg.width || 155;
            var pct = cfg.max > 0 ? Math.round((cfg.current || 0) / cfg.max * 100) : 0;
            var fillCls = cfg.fillClass || 'hp-fill';
            var anim = cfg.animated !== false ? 'transition:width 1.2s ease-out;' : '';
            return '<div class="progress-container ' + (cfg.containerClass || 'hp-bar') + '" style="width:' + w + 'px;"><div class="progress-fill ' + fillCls + '" style="width:' + pct + '%;' + anim + '"></div></div>';
        },

        // -- ModalRenderer: 弹窗骨架 --
        createModal: function(cfg) {
            cfg = cfg || {};
            var box = document.createElement('div');
            box.className = 'modal-box' + (cfg.extraClass ? ' ' + cfg.extraClass : '');
            box.style.cssText = 'width:min(' + (cfg.width || '800px') + ',90vw);background:var(--bg-modal);border:1px solid ' + (cfg.borderColor || 'var(--border-subtle)') + ';border-radius:12px;padding:0;display:flex;flex-direction:column;overflow:hidden;' + (cfg.boxStyle || '');
            var head = document.createElement('div');
            head.style.cssText = 'padding:20px 30px;background:' + (cfg.headBg || 'rgba(255,255,255,0.03)') + ';border-bottom:1px solid ' + (cfg.headBorder || 'rgba(255,255,255,0.06)') + ';display:flex;justify-content:space-between;align-items:center;';
            var body = document.createElement('div');
            body.style.cssText = 'padding:' + (cfg.bodyPadding || '20px') + ';display:flex;flex-direction:column;gap:' + (cfg.bodyGap || '12px') + ';overflow-y:auto;flex:1;';
            return { box: box, head: head, body: body };
        },

        // -- 弹窗头部标题行 --
        setModalHead: function(head, title, color, closeFn) {
            head.innerHTML = '<div class="txt-md txt-bold" style="color:' + (color || 'var(--text-main)') + '">' + (title || '') + '</div>';
            if (closeFn) {
                var btn = document.createElement('button');
                btn.className = 'btn btn-sm btn-tab-close';
                btn.textContent = '关闭';
                btn.addEventListener('click', closeFn);
                head.appendChild(btn);
            }
        }
    };

    return {
        evaluateFormula: evaluateFormula, evaluateCondition: evaluateCondition,
        resolveByPath: resolveByPath, deepClone: deepClone,
        ModifierStack: ModifierStack,
        DamagePipeline: DamagePipeline, StatusEngine: StatusEngine,
        IntentExecutor: IntentExecutor, PassiveEngine: PassiveEngine,
        LootEngine: LootEngine, TurnFlow: TurnFlow,
        UIRenderers: UIRenderers
    };
})();
