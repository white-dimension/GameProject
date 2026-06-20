/**
 * Combat.js — v3.1 战术连招引擎 (修复 进程 同步与战斗闭环)
 */
window.CombatSystem = (function () {
    'use strict';
    var GS = function () { return window.GameState.getState(); };
    var GD = function () { return window.GameData; };

    var _battleState = null;

    function startBattle(monsterId, options) {
        var gs = GS(); if (!gs) return;
        // 支持单怪物（字符串）或多怪物（数组）
        var ids = Array.isArray(monsterId) ? monsterId : [monsterId];
        var scale = window.GameState.getMapLevelScaling(gs);
        var monsters = [];
        for (var i = 0; i < ids.length; i++) {
            var m = GD().MONSTERS[ids[i]]; if (!m) continue;
            var hpScaled = Math.ceil(m.hp * scale.hpMul);
            var atkScaled = Math.ceil(m.atk * scale.atkMul);
            var defScaled = Math.ceil(m.def * scale.defMul);
            monsters.push({
                id: ids[i], name: m.name, hp: hpScaled, hpMax: hpScaled,
                atk: atkScaled, def: defScaled,
                _scaleAtk: scale.atkMul,
                intent: _generateIntent(m), status: {},
                affixes: [] // [新增] 维度词缀
            });
        }
        if (monsters.length === 0) return;

        // Loop 2+ 怪物词缀分配 — 数据驱动
        if (gs.mapState.loop >= 2) {
            var affixPool = GD().AFFIX_TEMPLATES || [];
            if (affixPool.length > 0) {
                monsters.forEach(function(mon) {
                    var mData = GD().MONSTERS[mon.id];
                    if (mData.tier === 'elite' || mData.tier === 'world_boss') {
                        var aff = affixPool[Math.floor(Math.random() * affixPool.length)];
                        mon.affixes.push({ id: aff.id, name: aff.name, desc: aff.desc, color: aff.color });
                        if (aff.onApply) aff.onApply(mon);
                    }
                });
            }
        }

        _battleState = {
            monsters: monsters,
            currentTarget: 0,
            turn: 1,
            phase: 'player_turn',
            log: [{ turn: 1, msg: '第 1 回合开始。' + (monsters.length > 1 ? ' 前方 ' + monsters.length + ' 只变异体！' : '') }],
            isDungeon: !!(options && options.isDungeon),
            isWandering: !!(options && options.wandering),
            dungeonEnv: (options && options.env) || null,
            pathAffix: (options && options.pathAffix) || null, // [新增] 接收路径词缀
            shieldAmount: 0,
            playerProcess: gs.player.process,
            playerStatus: {},
            playerRaces: [gs.player.masteries[0], gs.player.masteries[1], gs.player.masteries[2]].filter(function(r) { return r; })
        };

        // 应用路径感官词缀效果 — 数据驱动
        if (_battleState.pathAffix) {
            var af = _battleState.pathAffix;
            _log('<span style="color:' + af.color + '">【感官共鸣】' + af.name + '：' + af.desc + '</span>');
            _battleState.playerStatus['pathAffix'] = { name: af.name, color: af.color, desc: af.desc };
            var patTpl = (GD().PATH_AFFIX_TEMPLATES || []).find(function(t){ return t.id === af.id; });
            if (patTpl && patTpl.onBattleStart) {
                patTpl.onBattleStart(_battleState, gs);
                // 记录具体效果
                if (af.id === 'high_process') _log('<span style="color:var(--accent-green)">神经突触激活，初始进程 +2。</span>');
                else if (af.id === 'weak_bio') _log('<span style="color:var(--accent-red)">辐射削弱了全场敌人生命。</span>');
                else if (af.id === 'corrosive') _log('<span style="color:var(--accent-purple)">酸蚀环境蔓延，敌人已中毒。</span>');
            }
        }

        if (_battleState.dungeonEnv && _battleState.dungeonEnv.effect.startTox) {
            _battleState._toxAdded = _battleState.dungeonEnv.effect.startTox;
            gs.player.toxicity += _battleState._toxAdded;
            _log('<span style="color:var(--accent-purple)">环境异变：初始毒性 +' + _battleState._toxAdded + '。</span>');
        }
        if (_battleState.dungeonEnv) {
            _log('<span style="color:var(--accent-blue)">环境代码：' + _battleState.dungeonEnv.name + '（' + _battleState.dungeonEnv.desc + '）</span>');
        }

        // 判定双专精被动
        _applyGlobalPassives(gs.player);
        // 缓存组件效果供 UI 展示
        _battleState.componentEffects = _getComponentEffects();

        window.UISystem.render();
        // 首次战斗自动弹出教学
        if (gs && !gs.player._battleTutSeen && !_battleState._isTraining) {
            gs.player._battleTutSeen = true;
            setTimeout(function(){ window.UISystem.showHelpPanel('fight'); }, 600);
        }
        if (window.Sound && _battleState.monsters.length > 0) {
            var md = window.GameData.MONSTERS[_battleState.monsters[0].id];
            if (md && md.tier === 'world_boss') {
                window.Sound.playBossBGM(md.id);
            }
            window.Sound.monster(md ? md.race : null);
        }
    }

    // 获取当前目标怪物数据
    function _getMonster() {
        if (!_battleState || !_battleState.monsters) return null;
        return _battleState.monsters[_battleState.currentTarget] || null;
    }

    function _getMonsterData() {
        var m = _getMonster(); if (!m) return null;
        return GD().MONSTERS[m.id] || null;
    }

    function _allMonstersDead() {
        if (!_battleState || !_battleState.monsters) return true;
        for (var i = 0; i < _battleState.monsters.length; i++) {
            if (_battleState.monsters[i].hp > 0) return false;
        }
        return true;
    }

    function _getAliveMonsters() {
        if (!_battleState || !_battleState.monsters) return [];
        return _battleState.monsters.filter(function(m) { return m.hp > 0; });
    }

    function selectTarget(index) {
        if (!_battleState || !_battleState.monsters) return;
        var alive = _getAliveMonsters();
        if (alive.length === 0) return;
        var prev = _battleState.currentTarget;
        if (index >= 0 && index < _battleState.monsters.length && _battleState.monsters[index].hp > 0) {
            _battleState.currentTarget = index;
        } else {
            for (var i = 0; i < _battleState.monsters.length; i++) {
                if (_battleState.monsters[i].hp > 0) { _battleState.currentTarget = i; break; }
            }
        }
        if (_battleState.currentTarget !== prev && window.Sound) {
            var md = window.GameData.MONSTERS[_battleState.monsters[_battleState.currentTarget].id];
            window.Sound.monster(md ? md.race : null);
        }
        window.UISystem.render();
    }

    function playCard(slot, potionId) {
        if (!_battleState || _battleState.phase !== 'player_turn' || _battleState._fleeing) return;
        var gs = GS(); var p = gs.player;

        // --- 1. 魔药逻辑 ---
        if (potionId) {
            var pot = GD().POTIONS[potionId];
            var idx = gs.inventory.potions.indexOf(potionId);
            if (!pot || idx === -1) return;

            gs.inventory.potions.splice(idx, 1);
            p.toxicity += pot.toxicity;
            p._potionsUsed = (p._potionsUsed || 0) + 1;
            // 耐药性衰减：基于全局历史记录
            var consec = 0;
            var history = p._potionHistory || [];
            for (var hi = history.length - 1; hi >= 0; hi--) { if (history[hi] === potionId) consec++; else break; }
            var decayFactor = Math.max(0.3, Math.pow(0.7, consec));
            if (!p._potionHistory) p._potionHistory = [];
            p._potionHistory.push(potionId);
            if (p._potionHistory.length > 10) p._potionHistory.shift();

            _log('<span style="color:var(--accent-purple)">使用了 ' + pot.name + '。</span>毒性增加至 ' + p.toxicity + (consec > 0 ? ' (耐药效能' + Math.round(decayFactor * 100) + '%)' : ''));

            window.UISystem.showDamageFloat('<span class="icon icon-biohazard"></span>', 'var(--accent-purple)', 'player');

            var potTpl = (GD().POTION_TEMPLATES || {})[pot.id];
            if (potTpl && potTpl.effect) { potTpl.effect(_battleState, p, decayFactor, _getMonster, _getMonsterData, _log);
                if (pot.id === 'POT_HEAL') { _log('<span style="color:var(--accent-green)">凝血再生！防御暂时下降。</span>'); window.UISystem.showDamageFloat('+' + Math.ceil(p.hp_max * 0.4 * decayFactor), 'var(--accent-green)', 'player'); }
                else if (pot.id === 'POT_DEFENSE') { _log('<span style="color:var(--accent-blue)">表皮硬化！防御提升，攻击下降。</span>'); }
                else if (pot.id === 'POT_RAM') { _log('<span style="color:var(--accent-green)">进程回复 8 点，毒性 +5。</span>'); }
            }

            window.UISystem.render();
            return;
        }

        // --- 2. 技能逻辑 ---
        var baseCost = (slot === 'predatory_organ' ? 2 : 3);
        // Boss器官可能修改技能消耗
        var eqOrg = GD().BOSS_ORGANS && GD().BOSS_ORGANS[gs.player[slot].equipped];
        if (eqOrg && eqOrg.skillCost) baseCost = eqOrg.skillCost;
        if (_battleState.dungeonEnv && _battleState.dungeonEnv.effect.ramPenalty) {
            baseCost += _battleState.dungeonEnv.effect.ramPenalty;
        }
        var cost = baseCost + (_battleState._processPenalty || 0);
        if (_battleState._processPenalty) _battleState._processPenalty = 0; // 单次消耗后重置
        // 电子真菌：毒技能 35% 免 进程
        if (slot === 'gland_core' && _battleState.dualKey === 'ember+swarm' && Math.random() < 0.35) {
            cost = 0;
            _log('<span style="color:var(--accent-yellow)">【触突过载】电荷偏转！本次不消耗 进程。</span>');
        }
        if (_battleState.playerProcess < cost) return;

        _battleState.playerProcess -= cost;
        p.process = _battleState.playerProcess; // 强制写回 GameState 确保顶部 HUD 同步

        _executePlayerSkill(slot);
        if (_battleState) window.UISystem.render();
    }

    function _getComponentEffects() {
        var p = GS().player; if (!p) return {};
        var comps = GD().COMPONENTS || {};
        var effects = { armorPen: 0, bonusVsSwarm: 0, toxinConv: 0, lifeDrainChance: 0, lifeDrainAmt: 0, dotBonus: 0, thornsPct: 0, killHeal: 0, deathDefy: false, processOnHit: 0, critChance: 0, critMultiplier: 1.5, poisonImmune: false };
        ['predatory_organ', 'chitin_epidermis', 'gland_core'].forEach(function(sn) {
            var slot = p[sn]; if (!slot || !slot.component_slots) return;
            slot.component_slots.forEach(function(cid) {
                if (!cid || !comps[cid]) return;
                var a = comps[cid].affixes; if (!a) return;
                if (a.armorPenetration) effects.armorPen += a.armorPenetration;
                if (a.bonusVsSwarm) effects.bonusVsSwarm += a.bonusVsSwarm;
                if (a.toxinConversion) effects.toxinConv += a.toxinConversion;
                if (a.lifeDrainChance) { effects.lifeDrainChance = Math.max(effects.lifeDrainChance, a.lifeDrainChance); }
                if (a.lifeDrainAmount) effects.lifeDrainAmt += a.lifeDrainAmount;
                if (a.dotBonus) effects.dotBonus += a.dotBonus;
                if (a.thornsPercent) effects.thornsPct += a.thornsPercent;
                if (a.killHeal) effects.killHeal += a.killHeal;
                if (a.deathDefy) effects.deathDefy = true;
                if (a.processOnHit) effects.processOnHit += a.processOnHit;
                if (a.critChance) { effects.critChance = Math.max(effects.critChance, a.critChance); }
                if (a.critMultiplier) effects.critMultiplier = Math.max(effects.critMultiplier, a.critMultiplier);
                if (a.poisonImmune) effects.poisonImmune = true;
            });
        });
        return effects;
    }

    function _getSkillName(slot) { var p=GS().player; var eq=p[slot].equipped; if(eq){ var bo=GD().BOSS_ORGANS||{}; if(bo[eq]&&bo[eq].skillName) return bo[eq].skillName; } var defs={predatory_organ:'捕食打击',chitin_epidermis:'生物防御',gland_core:'腺体脉冲'}; return defs[slot]||'攻击'; }

    function _buildPipelineCtx(slot, baseAtk) {
        var gs = GS(); var p = gs.player;
        var m = _getMonsterData(); var curMon = _getMonster();
        var sData = p[slot];
        var syncLvl = gs.inventory.organSyncLevels[sData.equipped] || 1;
        var tierFactor = 1 + (sData.tier - 1) * 0.1 * syncLvl;
        var compFx = _getComponentEffects();
        var isCounter = false;
        if (m && m.race) {
            var counterRaces = (p.masteries || []).filter(function(r){return r;});
            for (var ci = 0; ci < counterRaces.length; ci++) {
                if ((counterRaces[ci] === 'mutant' && m.race === 'swarm') ||
                    (counterRaces[ci] === 'swarm' && m.race === 'ember') ||
                    (counterRaces[ci] === 'ember' && m.race === 'mutant')) { isCounter = true; break; }
            }
        }
        var coatingMultiplier = 1, coatingIgnoreDef = false, coatingShieldStrip = 0;
        if (p.activeCoating === 'COAT_ANTI_MUTANT' && m && m.race === 'mutant') { coatingMultiplier = 1.5; coatingIgnoreDef = true; }
        else if (p.activeCoating === 'COAT_ANTI_SWARM' && m && m.race === 'swarm') { coatingMultiplier = 1.6; }
        else if (p.activeCoating === 'COAT_ANTI_EMBER' && m && m.race === 'ember') { coatingMultiplier = 1.3; coatingShieldStrip = 100; }
        var organMultiplier = 1, organIgnoreDef = false;
        if (sData.equipped === '暴君核心') { organMultiplier = 2.5; organIgnoreDef = true; }
        else if (sData.equipped === '蜂后毒牙') { organMultiplier = 1.5; }
        else if (sData.equipped === '核心钻头') { organMultiplier = 2.0; organIgnoreDef = true; }
        else if (sData.equipped === '暴君腺体') { organMultiplier = 2.0; tierFactor = 1; }
        else if (sData.equipped === '蜂后髓核') { organMultiplier = 3.0; tierFactor = 1; }
        else if (sData.equipped === '高能电泳核') { organMultiplier = 2.0; tierFactor = 1; organIgnoreDef = true; }
        var dualMultiplier = 1, dualIgnoreDef = false;
        if (_battleState.dualKey === 'mutant+mutant') { dualMultiplier = 1.4; dualIgnoreDef = true; }
        var researchLvl = (gs.bestiary && gs.bestiary.researchLevels && gs.bestiary.researchLevels[curMon.id]) || 0;
        return {
            baseAtk: baseAtk, slot: slot,
            targetMon: curMon, targetData: m,
            organData: sData, tierFactor: tierFactor, syncLvl: syncLvl,
            coatingMultiplier: coatingMultiplier, coatingIgnoreDef: coatingIgnoreDef, coatingShieldStrip: coatingShieldStrip,
            organMultiplier: organMultiplier, organIgnoreDef: organIgnoreDef,
            dualMultiplier: dualMultiplier, dualIgnoreDef: dualIgnoreDef,
            isCounter: isCounter, compEffects: compFx,
            researchLvl: researchLvl, battleState: _battleState
        };
    }
    function _executePlayerSkill(slot) {
        var gs = GS(); var p = gs.player;
        var m = _getMonsterData();
        var curMon = _getMonster();
        var baseAtk = p.atk;
        var TE = window.TemplateEngine;

        window.UISystem.triggerShake('monster-icon');
        if (window.Sound) { if (slot === 'gland_core') window.Sound.electric(); else window.Sound.attack(); }
        if (_battleState.playerStatus['berserk']) {
            var berserkMult = _battleState.playerStatus['berserkMult'] || 1.0;
            baseAtk = Math.ceil(baseAtk * (1 + 0.5 * berserkMult));
        }
        if (_battleState.playerStatus['atkDebuff']) { baseAtk = Math.ceil(baseAtk * 0.8); }
        if (_battleState.dungeonEnv && _battleState.dungeonEnv.effect.nonEmberAtkMult) {
            var isEmberSkill = (p.masteries[0] === 'ember' || p.masteries[1] === 'ember') && slot === 'gland_core';
            if (!isEmberSkill) { baseAtk = Math.ceil(baseAtk * _battleState.dungeonEnv.effect.nonEmberAtkMult); }
        }

        var sData = p[slot];
        var syncLvl = gs.inventory.organSyncLevels[sData.equipped] || 1;
        var pipeCtx = _buildPipelineCtx(slot, baseAtk);
        var compFx = pipeCtx.compEffects;

        // ===== chitin_epidermis 纯护盾 =====
        if (slot === 'chitin_epidermis') {
            var eqChitin = p.chitin_epidermis.equipped;
            var chitinSync = syncLvl;
            var shield = 0;
            if (eqChitin === '暴君甲壳') {
                var smult = chitinSync >= 3 ? 1.8 : 1.2;
                shield = Math.ceil(baseAtk * smult);
                _battleState._chitinThorns = chitinSync >= 3 ? 0.25 : 0.15;
                _log('<span style="color:var(--accent-red)">骨板硬化！获得 ' + shield + ' 护盾，受击反弹' + Math.round(_battleState._chitinThorns*100) + '%伤害。' + (chitinSync >= 3 ? ' <b>觉醒强化！</b>' : '') + '</span>');
            } else if (eqChitin === '蜂后甲壳') {
                shield = Math.ceil(baseAtk * 0.8);
                _battleState._chitinHeal = chitinSync >= 3 ? 0.2 : 0.1;
                _log('<span style="color:var(--race-swarm)">幼虫护盾生成！获得 ' + shield + ' 护盾+每回合回复' + Math.round(_battleState._chitinHeal*100) + '%HP。' + (chitinSync >= 3 ? ' <b>觉醒强化！</b>' : '') + '</span>');
            } else if (eqChitin === '核心护盾') {
                shield = Math.ceil(baseAtk * 0.6);
                _battleState._chitinRegen = chitinSync >= 3 ? 2 : 1;
                _log('<span style="color:var(--race-ember)">纳米修复场启动！获得 ' + shield + ' 护盾+每回合+' + _battleState._chitinRegen + '进程。' + (chitinSync >= 3 ? ' <b>觉醒强化！</b>' : '') + '</span>');
            } else {
                shield = Math.ceil(baseAtk * 0.6);
                _log('<span style="color:var(--accent-green)">生物增殖，获得 ' + shield + ' 点防御护盾。</span>');
            }
            // 核心三件套：护盾+30%
            if (GS().player._shieldBonus) shield = Math.ceil(shield * (1 + GS().player._shieldBonus));
            _battleState.shieldAmount += shield;
            window.UISystem.showDamageFloat('<span class="icon icon-energy-shield"></span>' + shield, 'var(--accent-green)', 'player');
            return;
        }

        // ===== gland_core 连招倍率 =====
        if (slot === 'gland_core') {
            if (p.gland_core.equipped === '暴君腺体') {
                var stunChance = syncLvl >= 3 ? 0.7 : 0.4;
                if (Math.random() < stunChance) { curMon.status['stunned'] = 1; if (syncLvl >= 3) curMon._slowed = 2; }
            }
            // 连招引爆：所有腺体均可触发（Boss腺体无标记时才用专属效果）
            if (curMon.status['poison']) { pipeCtx.organMultiplier = 3.0; }
            else if (curMon.status['compromised']) { pipeCtx.organMultiplier = 2.0; }
            else if (!p.gland_core.equipped) { pipeCtx.organMultiplier = 0.5; }
        }

        // ===== predatory 器官特效 =====
        if (slot === 'predatory_organ') {
            if (sData.equipped === '暴君核心' && syncLvl >= 3) {
                _log('<span style="color:var(--accent-red)">【暴君觉醒】终极撕裂无视防御！</span>');
            }
            if (sData.equipped === '蜂后毒牙') {
                var poisonDur = syncLvl >= 3 ? 5 : 3;
                var poisonDmg = syncLvl >= 3 ? 5 : 2;
                curMon.status['poison'] = (curMon.status['poison'] || 0) + poisonDur;
                curMon._poisonDamage = poisonDmg;
                _log('<span style="color:var(--accent-purple)">【毒液注射】目标陷入猛毒，持续' + poisonDur + '回合！' + (syncLvl >= 3 ? ' <b>觉醒强化！</b>' : '') + '</span>');
            }
            if (sData.equipped === '核心钻头') {
                var critRate = syncLvl >= 3 ? 0.4 : 0.2;
                var critMult = syncLvl >= 3 ? 3 : 2;
                if (Math.random() < critRate) { pipeCtx.organMultiplier *= critMult; _log('<span style="color:var(--accent-yellow)">【超频贯穿】暴击×' + critMult + '！' + (syncLvl >= 3 ? ' <b>觉醒强化！</b>' : '') + '</span>'); }
            }
            if (pipeCtx.coatingShieldStrip > 0) { curMon._shield = Math.max(0, (curMon._shield || 0) - pipeCtx.coatingShieldStrip); }
        }

        // ===== DamagePipeline 计算伤害 =====
        var result = TE.DamagePipeline.calculate(pipeCtx);
        var damage = result.damage;

        // ===== 标记/连招（所有捕食器官均可触发）=====
        if (slot === 'predatory_organ' && m && m.race === 'ember') {
            if (curMon.status['ionized']) {
                delete curMon.status['ionized'];
                var shieldStrip = curMon._shield || 0; curMon._shield = 0;
                var splash = Math.ceil(damage * 0.5);
                _log('<span style="color:var(--accent-blue)">>> [电荷传导] 连招触发！剥离 ' + shieldStrip + ' 护盾，传导造成 ' + splash + ' 溅射伤害。</span>');
                _getAliveMonsters().forEach(function(om) { if (om !== curMon) { om.hp = Math.max(0, om.hp - splash); window.UISystem.showDamageFloat('-' + splash, 'var(--accent-blue)', 'monster'); } });
            } else {
                curMon.status['ionized'] = true;
                _log('<span style="color:var(--accent-blue)">'+_getSkillName('predatory_organ')+'造成电荷残留：目标已被【电离标记】。</span>');
            }
        }
        if (slot === 'predatory_organ' && !p.predatory_organ.equipped && Math.random() < 0.3) {
            curMon.status['poison'] = 3;
            _log('<span style="color:var(--accent-red)">发起'+_getSkillName('predatory_organ')+'：' + damage + '点伤害</span>，注入毒素标记。');
        } else if (slot === 'predatory_organ') {
            _log('<span style="color:var(--accent-red)">发起'+_getSkillName('predatory_organ')+'，造成 ' + damage + ' 点物理伤害。</span>');
        }
        if (slot === 'predatory_organ' && m && m.race === 'swarm') {
            curMon._compTicks = (curMon._compTicks || 0) + 1;
            if (curMon._compTicks >= 2) { curMon.status['compromised'] = 3; _log('<span style="color:var(--accent-yellow)">连续打击生效：目标已被【生物崩解标记】。</span>'); curMon._compTicks = 0; }
        }

        // ===== gland 器官日志 =====
        if (slot === 'gland_core') {
            var hadMark = false;
            if (curMon.status['poison']) { delete curMon.status['poison']; var heal = damage; p.hp = Math.min(p.hp_max, p.hp + heal); _log('<span style="color:var(--accent-yellow)">>> [基因融毁] 触发连招爆破！造成 ' + damage + ' 点伤害</span>，<span style="color:var(--accent-green)">吸取 ' + heal + ' HP</span>。'); window.UISystem.showDamageFloat('+' + heal, 'var(--accent-green)', 'player'); hadMark = true; }
            else if (curMon.status['compromised']) { curMon._dodging = false; curMon._vulnerable = 2; delete curMon.status['compromised']; _log('<span style="color:var(--accent-yellow)">>> [生物崩解] 连招触发！目标闪避归零，陷入易伤状态。造成 ' + damage + ' 点伤害。</span>'); hadMark = true; }
            if (!hadMark) {
            if (p.gland_core.equipped === '暴君腺体') {
                var extra2 = curMon.status['stunned'] ? '目标眩晕！' : '';
                if (syncLvl >= 3 && extra2) extra2 += ' 追加减速2回合 <b>觉醒强化！</b>';
                _log('<span style="color:var(--race-mutant)">>> [震波咆哮] 造成 ' + damage + '点伤害。' + extra2 + '</span>');
            } else if (p.gland_core.equipped === '蜂后髓核') {
                var healMsg = '汲取 ' + damage + ' HP';
                // 召唤工蜂：生成3只持续3回合的友方单位
                var droneCount = syncLvl >= 3 ? 5 : 3;
                var droneAtk = Math.ceil(p.atk * 0.4);
                if (!_battleState._drones) _battleState._drones = [];
                for (var di = 0; di < droneCount; di++) {
                    _battleState._drones.push({ name: '工蜂', atk: droneAtk, hp: 999, duration: 3 });
                }
                healMsg += ' · 召唤 ' + droneCount + ' 只工蜂（' + droneAtk + '攻/3回合）';
                if (syncLvl >= 3) { var stolenShield = Math.ceil(damage * 0.5); _battleState.shieldAmount += stolenShield; healMsg += ' 并生成 ' + stolenShield + ' 护盾'; }
                _log('<span style="color:var(--accent-yellow)">>> [母体孵化] 召唤集群突袭！造成 ' + damage + ' 点伤害。' + healMsg + '</span>');
                p.hp = Math.min(p.hp_max, p.hp + damage);
                window.UISystem.showDamageFloat('+' + damage, 'var(--accent-green)', 'player');
            } else if (p.gland_core.equipped === '高能电泳核') {
                if (syncLvl >= 3) {
                    var others = _getAliveMonsters().filter(function(m2) { return m2 !== curMon; });
                    others.forEach(function(om) { var splash2 = Math.ceil(damage * 0.5); om.hp = Math.max(0, om.hp - splash2); _log('<span style="color:var(--accent-blue)">>> [闪电链] 溅射伤害 ' + splash2 + ' 点。</span>'); });
                }
                _log('<span style="color:var(--accent-blue)">>> [电弧过载风暴] 释放高压电弧！造成 ' + damage + ' 点电离伤害。</span>');
            } else {
                _log('<span style="color:var(--accent-yellow)">'+_getSkillName('gland_core')+'造成 ' + damage + ' 点轻微酸蚀。</span>');
            }
            } // end if (!hadMark)
        }

        // ===== 通用后处理 =====
        if (curMon._dodging) { _log(m.name + ' 正在产卵闪避中！攻击落空。'); window.UISystem.showDamageFloat('闪避', 'var(--accent-yellow)', 'monster'); return; }
        if ((curMon._shield || 0) > 0) { var absorbed = Math.min(curMon._shield, damage); curMon._shield -= absorbed; damage -= absorbed; if (absorbed > 0) _log('<span style="color:var(--accent-blue);">护盾吸收 ' + absorbed + ' 点伤害。</span>'); }
        if (slot === 'predatory_organ' && m && m.physicalResist) { damage = Math.ceil(damage * (1 - m.physicalResist)); }

        if (result.defenseReduction > 0) {
            _log('<span style="color:var(--accent-red)">>> 发起攻击：造成 ' + damage + ' (' + (damage + result.defenseReduction) + '原始 - ' + result.defenseReduction + '防御) 点伤害。</span>');
        } else {
            _log('<span style="color:var(--accent-red)">>> 发起攻击：造成 ' + damage + ' 点伤害。</span>');
        }
        curMon.hp = Math.max(0, curMon.hp - damage);
        window.UISystem.showDamageFloat('-' + damage, 'var(--accent-red)', 'monster');
        window.UISystem.shakeMonsterCard(_battleState.currentTarget);

        if (curMon.affixes && curMon.affixes.some(function(a){return a.id==='thorns';})) {
            var reflect = Math.ceil(damage * 0.1); p.hp = Math.max(0, p.hp - reflect);
            _log('<span style="color:var(--accent-red)">【反馈】目标反弹了 ' + reflect + ' 点伤害！</span>');
            window.UISystem.showDamageFloat('-' + reflect, 'var(--accent-red)', 'player');
        }
        if (compFx.toxinConv > 0 && damage > 0) {
            var toxinExtra = Math.ceil(damage * compFx.toxinConv); curMon.hp = Math.max(0, curMon.hp - toxinExtra);
            _log('<span style="color:var(--accent-purple)">毒素转化额外造成 ' + toxinExtra + ' 点侵蚀。</span>');
        }
        if (curMon.hp <= 0) {
            selectTarget(0);
            _log('<span style="color:var(--accent-red)">' + curMon.name + ' 已融毁。</span>');
            if (compFx.killHeal > 0) { var healAmt = compFx.killHeal; p.hp = Math.min(p.hp_max, p.hp + healAmt); _log('<span style="color:var(--accent-green)">肾上腺素晶体：击杀回复 ' + healAmt + ' HP。</span>'); window.UISystem.showDamageFloat('+' + healAmt, 'var(--accent-green)', 'player'); }
        }
        if (_allMonstersDead()) { window.UISystem.render(); setTimeout(function(){ _winBattle(); }, 600); return; }
    }

    function endTurn() {
        if (!_battleState || _battleState.phase !== 'player_turn' || _battleState._fleeing) return;
        _battleState.phase = 'monster_turn';
        _log('<span style="color:var(--accent-orange)">--- 第 ' + _battleState.turn + ' 回合结束 ---</span>');
        _battleState.turn++; // 统一在回合结束时自增，确保玩家和怪物处于同回合
        _processStatusEffects();
        window.UISystem.render();
        setTimeout(_monsterAction, 800);
    }

    function _monsterAction() {
        if (!_battleState || _battleState.phase !== 'monster_turn') return;
        if (_battleState._isTraining) { _log('<span class="txt-dim">训练人偶待命中...</span>'); _finishMonsterTurn(); return; }
        var p = GS().player;
        var alive = _getAliveMonsters();
        if (alive.length === 0) { _winBattle(); return; }

        if (p.toxicity > 50 && _battleState.turn > 1) {
            var od = Math.ceil(p.hp_max * 0.02 * (_battleState._toxResistDebuff ? 1.2 : 1.0));
            p.hp = Math.max(0, p.hp - od);
            _log('<span style="color:var(--accent-purple)">[基因自溶] 体内毒素爆发，损失 ' + od + ' HP。' + (_battleState._toxResistDebuff ? '（毒素抗性削弱）' : '') + '</span>');
        }
        _log('<span style="color:var(--accent-orange)">>>> 第 ' + _battleState.turn + ' 回合开始。</span>');

        var processMonster = function(idx) {
            if (idx >= alive.length) { _finishMonsterTurn(); return; }
            var mon = alive[idx];
            if (mon.hp <= 0) { processMonster(idx + 1); return; }
            var md = GD().MONSTERS[mon.id];
            if (!md) { _log('<span style="color:var(--accent-red);">[错误] 未知怪物数据: ' + mon.id + '，已跳过。</span>'); processMonster(idx + 1); return; }
            var intent = mon.intent;

            // stun check
            if (intent.type === 'stun' || mon.status['stunned']) {
                if (mon.status['stunned']) mon.status['stunned'] = 0;
                _log('<span style="color:var(--text-dim);">' + mon.name + ' 眩晕，跳过回合。</span>');
                mon.intent = _generateIntent(md);
                window.UISystem.render();
                setTimeout(function() { processMonster(idx + 1); }, 400);
                return;
            }

            // Use IntentExecutor for handling
            var result = window.TemplateEngine.IntentExecutor.execute(mon, _battleState, p, idx);
            if (result.type === 'shield') {
                _log(result.msg || (mon.name + ' 获得 ' + result.value + ' 护盾。'));
            } else if (result.type === 'summon' || result.type === 'spawn') {
                if (result.value > 0) { p.hp = Math.max(0, p.hp - result.value); _log(result.msg); }
                else _log(result.msg || (mon.name + ' 正在集结力量...'));
            } else if (result.type === 'charge') {
                _log(result.msg);
            } else if (result.type === 'processPenalty') {
                _log(result.msg);
            } else if (result.type === 'damage' || !result.type || result.type === 'none') {
                var rawDmg = result.rawDamage || Math.ceil((intent.value || 0) * (mon._atkMult || 1) * (mon._scaleAtk || 1));
                rawDmg = Math.ceil(rawDmg * (mon._atkMult || 1));

                if (md.tier === 'world_boss' && _battleState.isWandering && _battleState.turn > 1) rawDmg *= 3;
                var origDmg = rawDmg;

                var effDef = p.def || 0;
                if (_battleState.playerStatus['defBoost']) effDef = Math.ceil(effDef * 1.5);
                if (_battleState.playerStatus['defDebuff']) effDef = Math.ceil(effDef * 0.8);
                var playerReduction = window.GameState.calcDamageReduction(effDef);
                var afterDef = Math.ceil(rawDmg * (1 - playerReduction));
                var defReduced = Math.floor(rawDmg * playerReduction);
                var finalDmg, breakdown = '';

                if (result.element === 'toxin' || intent.type === 'toxin') {
                    var poisonImmuneFlag = _getComponentEffects().poisonImmune;
                    if ((p.activeCoating === 'COAT_ANTI_SWARM' && md && md.race === 'swarm') || poisonImmuneFlag) {
                        finalDmg = 0;
                        _log('<span style="color:var(--accent-green);">毒素被' + (poisonImmuneFlag ? '解毒酶结晶' : '涂层') + '中和。</span>');
                    } else {
                        finalDmg = afterDef; p.hp = Math.max(0, p.hp - finalDmg);
                        _log('<span style="color:var(--accent-purple);">' + mon.name + ' 喷射毒素造成 ' + (finalDmg + ' (' + origDmg + '原始 - ' + defReduced + '防御)') + ' 点伤害。（无视护盾）</span>');
                    }
                } else {
                    var absorbed = Math.min(_battleState.shieldAmount || 0, afterDef);
                    finalDmg = Math.max(0, afterDef - absorbed);
                    _battleState.shieldAmount = Math.max(0, (_battleState.shieldAmount || 0) - afterDef);

                    if (_battleState.dualKey === 'ember+mutant') {
                        _battleState.shieldAmount = (_battleState.shieldAmount || 0) + Math.ceil(p.def * 0.3);
                        _battleState.playerProcess = Math.min(GS().player.process_max, _battleState.playerProcess + 1);
                        GS().player.process = _battleState.playerProcess;
                    }
                    var adaptBonus = Math.min(0.3, (p.bossFailCount || 0) * 0.1);
                    var afterAdapt = Math.ceil(finalDmg * (1 - adaptBonus));
                    if (afterAdapt < finalDmg) _log('<span style="color:var(--accent-green)">【基因自适应】减免了 ' + (finalDmg - afterAdapt) + ' 点伤害。</span>');
                    finalDmg = afterAdapt;
                    p.hp = Math.max(0, p.hp - finalDmg);
                    breakdown = finalDmg + ' (' + origDmg + '原始 - ' + defReduced + '防御' + (absorbed > 0 ? ' - ' + absorbed + '护盾' : '') + ')';
                    _log('<span style="color:var(--accent-red);">' + mon.name + ' 对你造成 ' + breakdown + ' 点伤害。</span>');
                }
                window.UISystem.triggerShake('app');
                if (window.Sound) window.Sound.hit();
                if (finalDmg > 0) window.UISystem.showDamageFloat('-' + finalDmg, 'var(--accent-red)', 'player');

                var cfx3 = _getComponentEffects();
                if (cfx3.processOnHit > 0 && finalDmg > 0) { _battleState.playerProcess = Math.min(GS().player.process_max, _battleState.playerProcess + cfx3.processOnHit); GS().player.process = _battleState.playerProcess; _log('<span style="color:var(--accent-green)">神经突触激活，受击回复 ' + cfx3.processOnHit + ' 进程。</span>'); }
                var cfx2 = _getComponentEffects();
                if (cfx2.thornsPct > 0 && rawDmg > 0) { var thornDmg = Math.ceil(rawDmg * cfx2.thornsPct); mon.hp = Math.max(0, mon.hp - thornDmg); _log('<span style="color:var(--accent-blue)">电磁反伤！' + mon.name + ' 受到 ' + thornDmg + ' 点反击伤害。</span>'); window.UISystem.showDamageFloat('<span class="icon icon-lightning-arc"></span>-' + thornDmg, 'var(--accent-blue)', 'monster'); if (_allMonstersDead()) { window.UISystem.render(); setTimeout(function(){ _winBattle(); }, 600); return; } }
                if (_battleState._chitinThorns && rawDmg > 0) { var boneThorn = Math.ceil(rawDmg * _battleState._chitinThorns); mon.hp = Math.max(0, mon.hp - boneThorn); _log('<span style="color:var(--race-mutant)">骨板反伤！' + mon.name + ' 受到 ' + boneThorn + ' 点反伤。</span>'); window.UISystem.showDamageFloat('-' + boneThorn, 'var(--accent-red)', 'monster'); if (_allMonstersDead()) { window.UISystem.render(); setTimeout(function(){ _winBattle(); }, 600); return; } }
                if (intent.bleed && !md.bleedImmune) { _battleState.playerStatus['bleed'] = intent.bleed.duration || 3; _log('<span style="color:var(--accent-red);">施加流血 ' + intent.bleed.duration + ' 回合。</span>'); }
                if (intent.selfDefBuff) mon._defBuff = (mon._defBuff || 0) + intent.selfDefBuff;
                if (md.recoilDamage && finalDmg > 0) { mon.hp = Math.max(0, mon.hp - md.recoilDamage); _log('<span style="color:var(--accent-blue)">' + mon.name + ' 受到 ' + md.recoilDamage + ' 反噬伤害。</span>'); window.UISystem.showDamageFloat('<span class="icon icon-lightning-arc"></span>-' + md.recoilDamage, 'var(--accent-blue)', 'monster'); }
                if (_battleState.dualKey === 'mutant+swarm' && Math.random() < 0.55) { mon.status['poison'] = 3; _log('<span style="color:var(--accent-purple);">【骨疽自溶】毒雾反击！</span>'); }

                if (result.healSelf) { mon.hp = Math.min(mon.hpMax, mon.hp + result.healSelf); _log(mon.name + ' 吸取了 ' + result.healSelf + ' 点生命。'); }
            } else if (result.type === 'enrage') {
                _log(result.msg);
            } else if (result.type === 'dodge') {
                _log(result.msg);
            } else if (result.msg) {
                _log(result.msg);
            }

            mon.intent = _generateIntent(md);
            window.UISystem.render();
            if (p.hp <= 0) { _doDefeat(); return; }
            var delay = (intent.type === 'stun' || mon.status['stunned']) ? 400 : 300;
            setTimeout(function() { processMonster(idx + 1); }, delay);
        };
        processMonster(0);
    }

    function _finishMonsterTurn() {
        var p = GS().player;
        if (p.hp <= 0) { _doDefeat(); return; }
        _battleState.phase = 'player_turn';

        // 环境伤害
        if (_battleState.dungeonEnv && _battleState.dungeonEnv.effect.turnDamage) {
            var ed = _battleState.dungeonEnv.effect.turnDamage;
            p.hp = Math.max(0, p.hp - ed);
            _log('<span style="color:var(--accent-blue)">环境异变 [' + _battleState.dungeonEnv.name + '] 对你造成 ' + ed + ' 点伤害。</span>');
            window.UISystem.showDamageFloat(ed, 'var(--accent-blue)', 'player');
            if (p.hp <= 0) { _doDefeat(); return; }
        }

        // 工蜂自动攻击
        if (_battleState._drones && _battleState._drones.length > 0) {
            var dmgTotal = 0;
            var aliveMons2 = _getAliveMonsters();
            _battleState._drones = _battleState._drones.filter(function(dr) {
                dr.duration--;
                if (dr.duration <= 0) return false;
                if (aliveMons2.length === 0) return false;
                var target = aliveMons2[Math.floor(Math.random() * aliveMons2.length)];
                var dmg = Math.ceil(dr.atk * (1 - window.GameState.calcDamageReduction(target.def || 0)));
                target.hp = Math.max(0, target.hp - dmg);
                dmgTotal += dmg;
                window.UISystem.showDamageFloat('-' + dmg, 'var(--accent-yellow)', 'monster');
                return true;
            });
            if (dmgTotal > 0) _log('<span style="color:var(--accent-yellow)">工蜂集群攻击！造成 ' + dmgTotal + ' 点伤害。（剩余 ' + _battleState._drones.length + ' 只）</span>');
            if (_allMonstersDead()) { _winBattle(); return; }
        }

        // 发送回合更新事件供 UI 渲染
        window.UISystem.render();
        // 流血伤害（护盾优先吸收）
        if (_battleState.playerStatus['bleed']) {
            var bleedDmg = GD().STATUS_CONSTANTS.bleed.damagePerTurn || 4;
            if ((_battleState.shieldAmount || 0) > 0) {
                var bleedAbs = Math.min(_battleState.shieldAmount, bleedDmg);
                _battleState.shieldAmount -= bleedAbs;
                bleedDmg -= bleedAbs;
                if (bleedAbs > 0) _log('<span style="color:var(--accent-blue);">护盾吸收 ' + bleedAbs + ' 点流血。</span>');
            }
            if (bleedDmg > 0) { p.hp = Math.max(0, p.hp - bleedDmg); _log('<span style="color:var(--accent-red);">流血造成 ' + bleedDmg + ' 点伤害。</span>'); }
            _battleState.playerStatus['bleed']--;
            if (_battleState.playerStatus['bleed'] <= 0) delete _battleState.playerStatus['bleed'];
        }
        // 怪物回合效果 — 数据驱动处理
        var aliveMons = _getAliveMonsters();
        aliveMons.forEach(function(mon) {
            var md = GD().MONSTERS[mon.id]; if (!md) return;
            // 护盾刷新
            if (md.shieldPerTurn) mon._shield = (mon._shield || 0) + md.shieldPerTurn;
            // 维度词缀处理
            (mon.affixes || []).forEach(function(a) {
                if (a.id === 'regen') { var rgn = Math.ceil(mon.hpMax * 0.05); mon.hp = Math.min(mon.hpMax, mon.hp + rgn); _log('<span style="color:var(--accent-green)">【再生】' + mon.name + ' 恢复了 ' + rgn + ' HP。</span>'); window.UISystem.showDamageFloat('+' + rgn, 'var(--accent-green)', 'monster'); }
                if (a.id === 'berserk') { var bd = Math.ceil(mon.hpMax * 0.05); mon.hp = Math.max(1, mon.hp - bd); _log('<span style="color:var(--accent-orange)">【死誓】' + mon.name + ' 燃尽生命，损失 ' + bd + ' HP。</span>'); }
            });
            // 狂怒触发
            if (md.intents) {
                var ei = md.intents.find(function(it){return it.type==='enrage';});
                if (ei && !mon._enraged && _battleState.turn >= (ei.triggerTurn||30)) { mon._enraged = true; mon._atkMult = (mon._atkMult||1) * (ei.value||2); _log('<span style="color:var(--accent-red);font-weight:bold;">' + mon.name + ' 进入狂怒！攻击力永久翻倍！</span>'); }
                // 蜂后产卵/闪避
                var si = md.intents.find(function(it){return it.type==='spawn';});
                if (si) {
                    var interval = si.spawnInterval || 3;
                    if (_battleState.turn % interval === 0 && !mon._dodging) { mon._dodging = true; if (!mon._originalDef) mon._originalDef = mon.def; mon.def = 0; _log('<span class="txt-red">' + mon.name + ' 开始产卵！获得 100% 闪避，但防御力归零。</span>'); }
                    if (mon._dodging && _battleState.turn % interval !== 0) { mon._dodging = false; if (mon._originalDef !== undefined) { mon.def = mon._originalDef; mon._originalDef = undefined; } _log('<span>' + mon.name + ' 产卵结束，防御力恢复。</span>'); }
                }
            }
        });

        var recoveryVal = GS().player.process_recovery || 3;
        var recovery = _battleState._noProcessRecovery ? 0 : Math.round(recoveryVal);

        // [新增] 维度词缀：扰频 (Jammer) - 减少 1 点进程回复
        var aliveMons2 = _getAliveMonsters();
        if (aliveMons2.some(function(m){ return m.affixes && m.affixes.some(function(a){return a.id==='jammer';}); })) {
            recovery = Math.max(1, recovery - 1);
            _log('<span style="color:var(--accent-blue)">【扰频】信号干扰中，进程回复效率下降。</span>');
        }

        _battleState._noProcessRecovery = false;
        var processCap = GS().player.process_max || GD().STATUS_CONSTANTS.processMax;
        _battleState.playerProcess = Math.min(processCap, _battleState.playerProcess + recovery);
        GS().player.process = _battleState.playerProcess;
        _log('<span style="color:var(--accent-green);">进程回复 ' + recovery + ' 点，当前 ' + _battleState.playerProcess + '/' + processCap + '</span>');
        // Boss器官被动：chitin_epidermis 回合效果
        if (_battleState._chitinHeal && p.hp < p.hp_max) {
            var healAmt2 = Math.ceil(p.hp_max * _battleState._chitinHeal);
            p.hp = Math.min(p.hp_max, p.hp + healAmt2);
            _log('<span style="color:var(--accent-green)">幼虫护盾恢复 ' + healAmt2 + ' HP。</span>');
        }
        if (_battleState._chitinRegen) {
            _battleState.playerProcess = Math.min(processCap, _battleState.playerProcess + _battleState._chitinRegen);
            GS().player.process = _battleState.playerProcess;
            _log('<span style="color:var(--accent-blue)">纳米修复场回复 ' + _battleState._chitinRegen + ' 进程。</span>');
        }
        if (p.coatingTurnsLeft > 0) { p.coatingTurnsLeft--; if (p.coatingTurnsLeft <= 0) { p.activeCoating = null; _log('<span class="txt-dim">涂层活性耗尽。</span>'); } }
        // 玩家状态递减 — StatusEngine + PassiveEngine
        var TE = window.TemplateEngine;
        if (_battleState.playerStatus['berserk']) {
            _battleState.playerStatus['berserk']--;
            p.hp = Math.max(0, p.hp - Math.ceil(p.hp_max * 0.005));
            if (_battleState.playerStatus['berserk'] <= 0) { delete _battleState.playerStatus['berserk']; _log('<span class="txt-dim">狂暴效果消退。</span>'); }
        }
        // 状态递减 — StatusEngine
        var pTargets = [{ target: { status: _battleState.playerStatus, hp: p.hp, hpMax: p.hp_max }, battleState: _battleState, playerHpMax: p.hp_max }];
        TE.StatusEngine.tickTurnEnd(pTargets);
        // 清理过期状态
        ['defBoost','defDebuff','atkDebuff'].forEach(function(s) {
            if (_battleState.playerStatus[s]) { _battleState.playerStatus[s]--; if (_battleState.playerStatus[s] <= 0) delete _battleState.playerStatus[s]; }
        });
        p.toxicity = Math.max(0, p.toxicity - 1);

        // 终焉母核 — PassiveEngine 触发 onTurnStart
        var alive2 = _getAliveMonsters();
        var psvCtx = { player: p, battleState: _battleState, allEnemies: alive2, target: alive2[0] };
        var psvResults = TE.PassiveEngine.trigger('onTurnStart', psvCtx);
        if (psvResults.length > 0) {
            if (window.Sound) window.Sound.electric();
            var psvLogs = TE.PassiveEngine.applyResults(psvResults, psvCtx, _battleState);
            psvLogs.forEach(function(l){ _log('<span style="color:' + (l.color||'var(--accent-blue)') + '">' + l.msg + '</span>'); });
            if (_allMonstersDead()) { window.UISystem.render(); setTimeout(function(){ _winBattle(); }, 600); return; }
        }
        window.UISystem.render();
    }

    function _doDefeat() {
        // 不死细胞核：致命伤害免死一次
        var compFx = _getComponentEffects();
        if (compFx.deathDefy && !_battleState._deathDefyUsed) {
            _battleState._deathDefyUsed = true;
            var p = GS().player;
            p.hp = 1;
            _log('<span style="color:var(--accent-yellow); font-weight:bold;">不死细胞核激活！从死亡边缘归来，HP 剩余 1。</span>');
            window.UISystem.showDamageFloat('免死!', 'var(--accent-yellow)', 'player');
            if (window.Sound) window.Sound.click();
            return;
        }
        _battleState.phase = 'defeat';
        if (window.Sound) { window.Sound.stopBGM(); window.Sound.defeat(); }
        _log('<span style="color:var(--accent-red); font-weight:bold;">>> 警告：原体序列彻底崩解... 神经链路断开。</span>');

        var gs = GS();
        if (gs && gs.player && _battleState.monsters.some(function(m){ return GD().MONSTERS[m.id].tier === 'world_boss'; })) {
            gs.player.bossFailCount = (gs.player.bossFailCount || 0) + 1; // 输给 Boss 增加计数
        }

        window.UISystem.render();
        function _deathOverlayHTML(msg, sub, btn) {
            return '<div style="text-align:center;" class="death-box">' +
                '<div class="txt-lg txt-red txt-bold" style="margin-bottom:' + (btn ? '16px' : '20px') + ';">序列崩解</div>' +
                (msg ? '<div class="txt-md txt-red txt-bold" style="margin-bottom:10px;">' + msg + '</div>' : '') +
                (sub ? '<div class="txt-xs txt-dim" style="margin-bottom:16px;">' + sub + '</div>' : '') +
                (btn ? btn : '<div class="progress-container" style="width:300px;margin:0 auto;"><div class="progress-fill hp-fill" id="death-countdown-fill" style="width:100%;"></div></div><div class="txt-sm txt-dim" style="margin-top:10px;">母巢重组中...</div>') +
                '</div>';
        }
        var cdEl = document.createElement('div');
        cdEl.id = 'death-overlay';
        cdEl.style.cssText = 'position:fixed;inset:0;z-index:3200;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);';
        cdEl.innerHTML = _deathOverlayHTML();
        document.body.appendChild(cdEl);
        requestAnimationFrame(function() {
            var fill = document.getElementById('death-countdown-fill');
            if (fill) { fill.style.transition = 'width 3s linear'; fill.style.width = '0%'; }
        });
        var doRespawn = function() {
            var el = document.getElementById('death-overlay'); if (el) el.remove();
            _battleState = null;
            var gs2 = GS();
            if (gs2 && gs2.player) {
                var p2 = gs2.player;
                p2.hp = p2.hp_max; p2.process = p2.process_max;
                p2.toxicity = 0; p2._potionHistory = []; p2._potionHistoryTick = 0;
                gs2.mapState.currentRoom = { type: 'camp', label: '<span class="icon icon-campfire"></span> 源初母巢', desc: '从基因崩解中艰难重组。' };
                // 死亡后刷新部分非Boss节点，避免只剩Boss打不过
                var pool2 = gs2.mapState.floorNodePool;
                if (pool2 && pool2.length > 0) {
                    var refreshable = [];
                    for (var ri = 0; ri < pool2.length; ri++) {
                        if (pool2[ri].type !== 'boss' && pool2[ri].type !== 'portal' && pool2[ri].exhausted) refreshable.push(ri);
                    }
                    var cnt = Math.min(3, refreshable.length);
                    for (var rc = 0; rc < cnt; rc++) {
                        var rIdx = Math.floor(Math.random() * refreshable.length);
                        pool2[refreshable.splice(rIdx, 1)[0]].exhausted = false;
                    }
                }
                window.WorldSystem.generateNextPaths();
                window.GameState.save();
                var logEl = document.getElementById('ui-log');
                if (logEl) {
                    var logDiv = document.createElement('div');
                    logDiv.className = 'txt-xs txt-dim';
                    logDiv.style.cssText = 'margin-bottom:5px;';
                    logDiv.innerHTML = '<span class="txt-green">></span> <span>基因重组完成。已返回母巢安全区。</span>';
                    logEl.insertBefore(logDiv, logEl.firstChild);
                }
            }
            window.UISystem.render();
        };
        setTimeout(function() {
            var gs = GS();
            if (gs && gs.player) {
                var p = gs.player;
                var penalty = Math.max(10, Math.floor(p.bp * 0.2));
                p.bp = Math.max(0, p.bp - penalty);
                window.GameState.save();
                cdEl.innerHTML = _deathOverlayHTML(
                    '失去 ' + penalty + ' 基因点数',
                    '剩余 ' + p.bp + ' | 将回到母巢重组',
                    '<button class="btn btn-red btn-capsule" id="death-respawn-btn" style="padding:10px 40px;">确认重组</button>'
                );
                var btn = document.getElementById('death-respawn-btn');
                if (btn) btn.addEventListener('click', function() {
                    // [修复] 死亡重组时也将进程状态同步
                    if (_battleState) GS().player.process = _battleState.playerProcess;
                    doRespawn();
                });
            }
        }, 3000);
    }

    function _winBattle() {
        _battleState.phase = 'victory';
        if (window.Sound) {
            window.Sound.stopBGM();
            window.Sound.victory();
        }
        var gs = GS();
        if (!gs.bestiary.killCount) gs.bestiary.killCount = {};

        var scale = window.GameState.getMapLevelScaling(gs);
        var totalBp = 0;
        var totalXp = 0;
        var allDrops = [];

        var hasBoss = false;
        _battleState.monsters.forEach(function(mon) {
            var m = GD().MONSTERS[mon.id]; if (!m) return;
            if (m.tier === 'world_boss') { gs.player.bossFailCount = 0; hasBoss = true; }
            gs.bestiary.killCount[mon.id] = (gs.bestiary.killCount[mon.id] || 0) + 1;
            totalBp += Math.ceil((Math.floor(Math.random() * (m.bpReward[1] - m.bpReward[0] + 1)) + m.bpReward[0]) * scale.bpMul);
            var xpGain = Math.ceil(m.level * 15 * scale.xpMul);
            // 路径词缀 — 数据驱动
            var patAff = _battleState.pathAffix;
            var patTpl = patAff ? (GD().PATH_AFFIX_TEMPLATES || []).find(function(t){ return t.id === patAff.id; }) : null;
            if (patTpl && patTpl.xpMult) xpGain = Math.ceil(xpGain * patTpl.xpMult);
            totalXp += xpGain;
            // 研究等级3：掉落率+25%
            var dropChance = m.drop ? m.drop.chance : 0;
            if (gs.bestiary.researchLevels && gs.bestiary.researchLevels[mon.id] >= 3) dropChance *= 1.25;
            if (m.drop && Math.random() < dropChance) {
                var extraDrop = (patTpl && patTpl.extraDrop) ? patTpl.extraDrop : 0;
                if (m.tier !== 'world_boss') {
                    var dropId = m.drop.pool ? GD().getRandomBossOrgan(m.drop.pool) : m.drop.id;
                    if (m.drop.type === 'organ') { gs.inventory.organs.push(dropId); }
                    else { gs.inventory.components[dropId] = (gs.inventory.components[dropId] || 0) + 1 + extraDrop; }
                }
                allDrops.push(m.drop.pool ? '随机Boss器官' : m.drop.id);
                if (extraDrop) allDrops.push(m.drop.id + "(额外)");
            }
        });

        gs.player.bp += totalBp;
        // Boss宝箱：暂存掉落，等玩家点击宝箱再发放
        if (hasBoss) {
            var bossMon = _battleState.monsters.find(function(mon) { var md = GD().MONSTERS[mon.id]; return md && md.tier === 'world_boss'; });
            var bossData = bossMon ? GD().MONSTERS[bossMon.id] : null;
            if (bossData && bossData.drop) {
                // [修复] 必须缓存总 BP 奖励，防止宝箱发放时计算丢失
                var currentTotalBp = totalBp;
                var bossDropId = bossData.drop.pool ? GD().getRandomBossOrgan(bossData.drop.pool) : bossData.drop.id;
                _battleState._bossChest = {
                    bossName: bossData.name,
                    bpReward: currentTotalBp,
                    dropId: bossDropId,
                    dropType: bossData.drop.type,
                    dropPool: bossData.drop.pool || null
                };
                totalBp = 0;
                allDrops = allDrops.filter(function(d) { return d !== (bossData.drop.pool ? '随机Boss器官' : bossData.drop.id); });
            }
        }
        var dropCounts = {}; allDrops.forEach(function(d) { dropCounts[d] = (dropCounts[d] || 0) + 1; });
        var dropParts = []; Object.keys(dropCounts).forEach(function(d) { dropParts.push(d + ' \u00D7' + dropCounts[d]); });
        var xpResult = window.GameState.gainXp(totalXp);
        var dropMsg = dropParts.length > 0 ? ' | 获得材料：' + dropParts.join(', ') : '';
        var rewardMsg = '<span style="color:var(--accent-red)">>> 全部目标已融毁。</span> <span style="color:var(--accent-yellow)">获得基因点数：' + totalBp + '</span>' + dropMsg;
        if (xpResult && xpResult.leveled) {
            rewardMsg += '  <span style="color:var(--accent-blue);font-weight:bold;">等阶提升至 ' + xpResult.newLevel + '！+1专精点</span>';
        }
        // 同步进程到全局状态
        GS().player.process = _battleState.playerProcess;
        _log(rewardMsg);
        window.UISystem.render();

        // 合并战斗胜利通知
        var notifyTitle = '+ ' + totalBp + ' 基因点数';
        var notifySub = dropParts.length > 0 ? dropParts.join('  ') + '  ' : '';
        if (xpResult && xpResult.leveled) notifySub += '等阶提升至 ' + xpResult.newLevel;
        setTimeout(function() {
            window.UISystem.showNotification(notifyTitle, notifySub || null, 'var(--accent-yellow)');
        }, 400);
    }

    function _processStatusEffects() {
        if (!_battleState || !_battleState.monsters) return;
        var TE = window.TemplateEngine;
        var dotPct = _battleState.dualKey === 'swarm+swarm' ? 0.10 : 0.05;
        var cfx = _getComponentEffects();
        var bleedDmg = (GD().STATUS_CONSTANTS && GD().STATUS_CONSTANTS.bleed.damagePerTurn) || 4;
        var targets = [];
        _battleState.monsters.forEach(function(mon) {
            if (mon.hp > 0) targets.push({ target: mon, battleState: _battleState, hpMax: mon.hpMax, dotBonus: cfx.dotBonus || 0, dotPct: dotPct, bleedDmg: bleedDmg });
        });
        TE.StatusEngine.tickTurnStart(targets);
        _battleState.monsters.forEach(function(mon) {
            if (mon.status['poison'] && mon.hp > 0) {
                var dot = Math.ceil(mon.hpMax * dotPct) + (cfx.dotBonus || 0) + (mon._poisonDamage || 0);
                window.UISystem.showDamageFloat(dot, 'var(--accent-purple)', 'monster');
                _log('<span style="color:var(--accent-purple)">' + mon.name + ' 毒素发作 -' + dot + ' HP。（剩余' + (mon.status['poison'] - 1) + '回合）</span>');
                // 递减 counter（与旧逻辑一致：在回合结束-怪物行动前递减）
                mon.status['poison']--;
                if (mon.status['poison'] <= 0) { delete mon.status['poison']; _log('<span style="color:var(--text-dim);">' + mon.name + ' 毒素已清除。</span>'); }
                if (cfx.lifeDrainChance > 0 && Math.random() < cfx.lifeDrainChance) {
                    var p = GS().player;
                    var drain = Math.min(cfx.lifeDrainAmt, mon.hp);
                    p.hp = Math.min(p.hp_max, p.hp + drain);
                    _log('<span style="color:var(--accent-green)">活性孢子吸取 ' + drain + ' HP。</span>');
                    window.UISystem.showDamageFloat('+' + drain, 'var(--accent-green)', 'player');
                }
            }
        });
        if (_battleState.dualKey === 'ember+mutant' && _battleState.playerStatus['bleed']) {
            delete _battleState.playerStatus['bleed'];
        }
    }

    function _generateIntent(m) {
        var intents = (m.intents || [{label:'未知行为', value:5}]).filter(function(it) {
            // [修复] 允许 spawn (Boss 产卵) 意图被抽取，只过滤 enrage (狂怒是状态而非行为)
            return it.type !== 'enrage';
        });
        if (intents.length === 0) return { label: '未知行为', value: 5, type: 'physical' };
        return intents[Math.floor(Math.random() * intents.length)];
    }

    function _applyGlobalPassives(p) {
        var TE = window.TemplateEngine;
        var mk = '';
        var activeRaces = (p.masteries || []).filter(function(r){return r;});
        if (activeRaces.length >= 2) {
            var racePriority = { mutant: 1, swarm: 2, ember: 3 };
            activeRaces.sort(function(a,b){ return (racePriority[a]||99) - (racePriority[b]||99); });
            mk = [activeRaces[0], activeRaces[1]].sort().join('+');
        }
        if (!mk) return;
        _battleState.dualKey = mk;
        var passiveKey = 'dual_' + mk.replace(/\+/g, '+');
        var tpl = GD().PASSIVE_TEMPLATES[passiveKey];
        if (!tpl) return;
        TE.PassiveEngine.clear();
        TE.PassiveEngine.register([tpl]);
        _log('<span style="color:' + (tpl.color || 'var(--text-dim)') + ';">被动【' + tpl.name + '】激活：' + tpl.passiveDesc + '</span>');
        var ctx = { player: p, battleState: _battleState };
        var results = TE.PassiveEngine.trigger('onBattleStart', ctx);
        TE.PassiveEngine.applyResults(results, ctx, _battleState);
    }

    function _log(msg) { _battleState.log.push({ turn: _battleState.turn, msg: msg }); }
    function isInBattle() { return _battleState !== null; }
    function exitBattle() {
        if (window.Sound) window.Sound.stopBGM();
        // Boss宝箱自动开启
        if (_battleState && _battleState._bossChest) openBossChest();
        var gs = GS();
        // [修复] 战斗结束时将镜像进程同步回全局状态
        if (gs && _battleState) {
            gs.player.process = _battleState.playerProcess;
            // 清理环境毒性
            if (_battleState._toxAdded) {
                gs.player.toxicity = Math.max(0, gs.player.toxicity - _battleState._toxAdded);
            }
        }
        // 游荡Boss不触发通关标记
        if (gs && gs.mapState.currentRoom && gs.mapState.currentRoom.type === 'boss' && !gs.mapState.currentRoom.wandering) {
            gs.mapState.bossDefeated = true;
            gs.mapState.portalUnlocked = true;
        }
        var wasTraining = _battleState && _battleState._isTraining;
        _log('<span style="color:var(--accent-green)">神经链路重新校准，脱离战斗模式。</span>'); window.UISystem.render();
        _battleState = null;
        if (!wasTraining) {
            window.WorldSystem.generateNextPaths(); window.UISystem.render();
            window.GameState.save();
        } else {
            window.UISystem.render();
        }
    }

    function startTraining() {
        if (_battleState) return;
        startBattle(['TRAINING_DUMMY_MUTANT', 'TRAINING_DUMMY_SWARM', 'TRAINING_DUMMY_EMBER'], {});
        if (_battleState) _battleState._isTraining = true;
    }

    function dungeonDeep() {
        if (!_battleState || !_battleState.isDungeon) return;
        var floor = (_battleState._dungeonFloor || 0) + 1;
        var cfg = GD().DIFFICULTY_CONFIG || {};
        var fn = (cfg.floorNames && cfg.floorNames[floor]) ? cfg.floorNames[floor] : ('地下' + floor + '层');
        _log('>> 深入地下城 ' + fn + '... HP 继承。');
        var ids;
        if (floor >= (cfg.dungeonFloors ? cfg.dungeonFloors.bossFloor : 3)) {
            var bossPool = (cfg.dungeonFloors && cfg.dungeonFloors.bossPool) || ['MON_CH1_TYRANT','MON_CH1_QUEEN','MON_CH1_CORE'];
            ids = [bossPool[Math.floor(Math.random() * bossPool.length)]];
        } else {
            var monPool = (cfg.dungeonFloors && cfg.dungeonFloors.monsterPool) || ['MON_CH1_CLEANER','MON_CH1_GUARD'];
            var cnt = (cfg.dungeonFloors && cfg.dungeonFloors.monstersPerFloor) || 2;
            ids = [];
            for (var i = 0; i < cnt; i++) ids.push(monPool[Math.floor(Math.random() * monPool.length)]);
        }
        _battleState = null;
        startBattle(ids, { isDungeon: true });
        _battleState._dungeonFloor = floor;
    }
    function openBossChest() {
        if (!_battleState || !_battleState._bossChest) return;
        var chest = _battleState._bossChest;
        var gs = GS();

        // 发放 BP 和 核心器官
        gs.player.bp += chest.bpReward;
        if (chest.dropType === 'organ') {
            gs.inventory.organs.push(chest.dropId);
        } else {
            gs.inventory.components[chest.dropId] = (gs.inventory.components[chest.dropId] || 0) + 1;
        }

        // [新增] 领主宝箱额外产出：随机 3-5 个组件碎片
        var allCompIds = Object.keys(GD().COMPONENTS);
        var count = 3 + Math.floor(Math.random() * 3);
        for (var i = 0; i < count; i++) {
            var cid = allCompIds[Math.floor(Math.random() * allCompIds.length)];
            gs.inventory.components[cid] = (gs.inventory.components[cid] || 0) + 1;
        }

        _log('<span style="color:var(--accent-yellow);font-weight:bold;">>> 领主宝箱开启！获得 ' + chest.bpReward + ' BP、' + chest.dropId + ' 及额外 ' + count + ' 份组织碎片。</span>');
        window.UISystem.showNotification('宝箱大爆！', '额外获得 ' + count + ' 个高阶碎片', 'var(--accent-yellow)');

        _battleState._bossChest = null;
        window.GameState.save();
        window.UISystem.render();
    }
    function getBattleState() { return _battleState; }

    function flee() {
        if (!_battleState || _battleState.phase !== 'player_turn' || _battleState._fleeing) return;
        var gs = GS();

        // [新增] 逃跑时机判定：仅限首回合
        if (_battleState.turn > 1) {
            _log('<span style="color:var(--accent-red)">逃跑协议已锁定。只有在战斗第 1 回合才能执行紧急切断。</span>');
            window.UISystem.render();
            return;
        }

        var cost = 4;
        if (_battleState.playerProcess < cost) {
            _log('<span style="color:var(--accent-red)">进程不足，无法执行紧急切断（需 4 进程）。</span>');
            window.UISystem.render();
            return;
        }
        _battleState.playerProcess -= cost;
        gs.player.process = _battleState.playerProcess;

        // 逃跑成功率
        var successRate = 1.0;
        var mon = _getMonsterData();
        if (mon) {
            if (mon.tier === 'elite') successRate = 0.75;
            else if (mon.tier === 'world_boss') successRate = 0.4;
        }

        if (Math.random() < successRate) {
            _battleState._fleeing = true;
            _log('<span style="color:var(--accent-red)">消耗 4 进程执行紧急神经切断。已脱离战斗。</span>');
            window.UISystem.render();
            setTimeout(function() {
                // [修复] 逃跑成功时也需要清理环境毒性并保存
                if (_battleState && _battleState._toxAdded) {
                    gs.player.toxicity = Math.max(0, gs.player.toxicity - _battleState._toxAdded);
                }
                _battleState = null;
                window.WorldSystem.generateNextPaths();
                window.UISystem.render();
                window.GameState.save();
            }, 400);
        } else {
            _log('<span style="color:var(--accent-red)">神经切断失败！被 ' + (mon ? mon.name : '目标') + ' 压制。</span>');

            // [新增] 世界 Boss 惩罚：逃跑失败直接承受一次高额伤害（数值碾压）
            if (mon && mon.tier === 'world_boss') {
                var penaltyDmg = Math.ceil(gs.player.hp_max * 0.25);
                gs.player.hp = Math.max(1, gs.player.hp - penaltyDmg);
                _log('<span style="color:var(--accent-red)">【数值碾压】' + mon.name + ' 对你造成了 ' + penaltyDmg + ' 点逃离惩罚伤害！</span>');
                window.UISystem.showDamageFloat(penaltyDmg, 'var(--accent-red)', 'player');
            }

            window.UISystem.render();
        }
    }

    return {
        startBattle: startBattle,
        playCard: playCard,
        endTurn: endTurn,
        isInBattle: isInBattle, exitBattle: exitBattle, startTraining: startTraining,
        getBattleState: getBattleState,
        flee: flee, selectTarget: selectTarget, dungeonDeep: dungeonDeep,
        openBossChest: openBossChest
    };
})();
