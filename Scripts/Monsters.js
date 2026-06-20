/**
 * Monsters.js — v3.0 怪物图鉴数据库
 */

window.MonsterDB = (function () {
    'use strict';

/**
 * Data.js — v3.0 全量静态数据库
 * 怪物图鉴 / 器官 / Component碎片 / 魔药 / 涂层 / 专精
 */

window.GameData = (function () {
    'use strict';

    const RACE = {
        MUTANT: 'mutant',
        SWARM: 'swarm',
        EMBER: 'ember'
    };

    const RACE_LORE = {
        mutant: '由「原生质分裂计划」导致的血肉失控产物。它们通过疯狂的细胞增殖来抵御严寒，每一个褶皱里都流淌着渴望同化的贪婪。在终端记录中，异变者被标记为最原始的威胁，其物理撕裂能力能轻易粉碎防护服。',
        swarm: '这些被称为「毒蛾」的寄生生物并非自然演化，而是实验室废弃培养皿中的二次寄生。它们散播致幻的孢子与酸性毒素，能直接渗透进原体的神经突触。由于其极小的个体体积，机械防御对其收效甚微。',
        ember: 'Rogue AI「余烬」在闸门锁死后，通过纳米真菌接管了所有的安保无人机与清理机器人。它们执行着逻辑冰冷的「格式化」程序，试图用高能电弧清理实验室内的一切有机残留。由于其金属构造，传统的物理打击极难穿透。'
    };

    const MONSTERS = {
        MON_CH1_ZOMBIE: {
            id: 'MON_CH1_ZOMBIE',
                        icon: 'mon_ch1_zombie',
            image: '../Assets/Monsters/实验室废弃体.png',
            name: '实验室废弃体',
            race: RACE.MUTANT,
            tier: 'common',
            level: 1,
            hp: 30,
            atk: 8,
            def: 2,
            bleedImmune: true,
            intents: [
                { type: 'physical', label: '<span class="icon icon-sword-clash"></span> 物理撕裂', value: 8, desc: '造成 8 点物理撕裂' }
            ],
            weakness: '基础肉体，无特殊抗性。',
            drop: { type: 'component', id: '变异组织', chance: 0.6 },
            bpReward: [2, 5]
        },
        MON_CH1_RIOT: {
            id: 'MON_CH1_RIOT',
                        icon: 'mon_ch1_riot',
            image: '../Assets/Monsters/暴动实验体.png',
            name: '暴动实验体',
            race: RACE.MUTANT,
            tier: 'common',
            level: 3,
            hp: 55,
            atk: 12,
            def: 4,
            bleedImmune: true,
            intents: [
                { type: 'physical', label: '<span class="icon icon-dripping-blade"></span> 物理+流血', value: 12, desc: '造成 12 点物理伤害并施加 3 回合流血', bleed: { duration: 3, damage: 4 } }
            ],
            weakness: '建议使用毒素攻击无视其流血抗性。装配生物表皮护盾可有效防御。',
            drop: { type: 'component', id: '肾上腺素晶体', chance: 0.5 },
            bpReward: [2, 5]
        },
        MON_CH1_CLEANER: {
            id: 'MON_CH1_CLEANER',
                        icon: 'mon_ch1_cleaner',
            image: '../Assets/Monsters/异化保洁员.png',
            name: '异化保洁员',
            race: RACE.MUTANT,
            tier: 'elite',
            level: 5,
            hp: 90,
            atk: 24,
            def: 8,
            bleedImmune: true,
            intents: [
                { type: 'charge', label: '<span class="icon icon-flanged-mace"></span> 蓄力横扫', value: 24, desc: '蓄力横扫，下回合造成 24 点物理重砸', chargeTurns: 1 }
            ],
            weakness: '动作极其缓慢，可在其蓄力回合使用【神经阻断减速剂】进行打断。',
            drop: { type: 'component', id: '异变肌肉束', chance: 0.4 },
            bpReward: [15, 20]
        },
        MON_CH1_GUARD: {
            id: 'MON_CH1_GUARD',
                        icon: 'mon_ch1_guard',
            image: '../Assets/Monsters/受损生化卫兵.png',
            name: '受损生化卫兵',
            race: RACE.MUTANT,
            tier: 'elite',
            level: 8,
            hp: 140,
            atk: 16,
            def: 20,
            bleedImmune: true,
            intents: [
                { type: 'shield', label: '<span class="icon icon-energy-shield"></span> 生物硬壳护盾', value: 20, desc: '自身获得 20 点生物硬壳护盾' }
            ],
            weakness: '高防御低攻击。涂抹【细胞壁溶解酶涂层】或使用毒素攻击可迅速击破。',
            drop: { type: 'component', id: '不死细胞核', chance: 0.4 },
            bpReward: [15, 20]
        },
        MON_CH1_TYRANT: {
            id: 'MON_CH1_TYRANT',
                        icon: 'mon_ch1_tyrant',
            name: '一号实验体：暴君',
            race: RACE.MUTANT,
            tier: 'world_boss',
            image: '../Assets/Monsters/暴君（一号实验体）.png',
            level: 15,
            hp: 400,
            atk: 45,
            def: 30,
            bleedImmune: true,
            physicalResist: 0.5,
            intents: [
                { type: 'physical', label: '<span class="icon icon-sword-clash"></span> 物理重击', value: 45, desc: '造成 45 点物理伤害' },
                { type: 'enrage', label: '<span class="icon icon-enrage"></span> 狂怒', value: 2.0, desc: '第 30 回合强制触发狂怒，攻击力永久提升至 2.0 倍', triggerTurn: 30 }
            ],
            weakness: '极度危险。皮肤免疫 50% 物理伤害。战前必须前往生物炼金釜配置【野性狂暴血清】进行速杀；战斗中先用捕食打击挂毒，再用腺体脉冲打出基因融毁爆破。',
            drop: { type: 'organ', pool: 'MON_CH1_TYRANT', chance: 1.0 },
            bpReward: [100, 100]
        },

        MON_CH1_RAT: {
            id: 'MON_CH1_RAT',
                        icon: 'mon_ch1_rat',
            image: '../Assets/Monsters/变异实验鼠.png',
            name: '变异实验鼠',
            race: RACE.SWARM,
            tier: 'common',
            level: 1,
            hp: 25,
            atk: 10,
            def: 1,
            intents: [
                { type: 'physical', label: '<span class="icon icon-spiked-mace"></span> 穿透物理', value: 10, desc: '造成 10 点穿透物理伤害' }
            ],
            weakness: '外壳薄弱，防御器官的电磁反伤可瞬间将其震碎。',
            drop: { type: 'component', id: '毒囊材料', chance: 0.6 },
            bpReward: [2, 5]
        },
        MON_CH1_LARVA: {
            id: 'MON_CH1_LARVA',
                        icon: 'mon_ch1_larva',
            image: '../Assets/Monsters/实验舱幼体.png',
            name: '实验舱幼体',
            race: RACE.SWARM,
            tier: 'common',
            level: 2,
            hp: 35,
            atk: 14,
            def: 2,
            intents: [
                { type: 'toxin', label: '<span class="icon icon-poison-gas"></span> 毒素侵蚀', value: 14, desc: '喷射酸液，造成 14 点持续毒素伤害' }
            ],
            weakness: '免疫毒素，但外壳薄弱。使用纯物理攻击可轻松击破。',
            drop: { type: 'component', id: '毒囊材料', chance: 0.6 },
            bpReward: [2, 5]
        },
        MON_CH1_SPORE: {
            id: 'MON_CH1_SPORE',
                        icon: 'mon_ch1_spore',
            image: '../Assets/Monsters/孢子蔓延者.png',
            name: '孢子蔓延者',
            race: RACE.SWARM,
            tier: 'elite',
            level: 6,
            hp: 100,
            atk: 6,
            def: 6,
            drugResist: 0.5,
            intents: [
                { type: 'drain', label: '<span class="icon icon-leeching-worm"></span> 寄生吸取', value: 6, desc: '播撒寄生菌，每回合吸取原体 6 点生命值' }
            ],
            weakness: '具有极高的耐药性，药剂对其效果递减 50%。必须依赖防御器官的电磁反伤造成基因融毁。',
            drop: { type: 'component', id: '活性孢子', chance: 0.4 },
            bpReward: [15, 20]
        },
        MON_CH1_HIVE: {
            id: 'MON_CH1_HIVE',
                        icon: 'mon_ch1_hive',
            image: '../Assets/Monsters/母体蜂群.png',
            name: '母体蜂群',
            race: RACE.SWARM,
            tier: 'elite',
            level: 7,
            hp: 120,
            atk: 5,
            def: 4,
            intents: [
                { type: 'summon', label: '<span class="icon icon-alien-bug"></span> 召唤工蜂', value: 3, desc: '召唤 3 只工蜂协助攻击，每只提供 5 点连击伤害', summonCount: 3, summonDamage: 5 }
            ],
            weakness: '外壳薄弱，极度惧怕异变者的捕食打击。建议装配【源初毁灭者】进行碾压。',
            drop: { type: 'component', id: '几丁质装甲', chance: 0.4 },
            bpReward: [15, 20]
        },
        MON_CH1_QUEEN: {
            id: 'MON_CH1_QUEEN',
                        icon: 'mon_ch1_queen',
            name: '畸变蜂后',
            race: RACE.SWARM,
            tier: 'world_boss',
            image: '../Assets/Monsters/蜂后（畸变蜂后）.png',
            level: 15,
            hp: 380,
            atk: 30,
            def: 15,
            intents: [
                { type: 'spawn', label: '<span class="icon icon-egg-clutch"></span> 产卵孵化', value: 0, desc: '每 3 回合产卵孵化一波怪潮，蜂后自身获得 100% 闪避', spawnInterval: 3, dodgeRate: 1.0, defenseZero: true }
            ],
            weakness: '产卵期间防御力归零，必须在其产卵意图亮起时，用腺体脉冲打出基因融毁爆破以终止其孵化。',
            drop: { type: 'organ', pool: 'MON_CH1_QUEEN', chance: 1.0 },
            bpReward: [100, 100]
        },

        MON_CH1_CLEANER_ROBOT: {
            id: 'MON_CH1_CLEANER_ROBOT',
                        icon: 'mon_ch1_cleaner_robot',
            image: '../Assets/Monsters/报废清理机.png',
            name: '报废清理机',
            race: RACE.EMBER,
            tier: 'common',
            level: 1,
            hp: 35,
            atk: 6,
            def: 6,
            bleedImmune: true,
            intents: [
                { type: 'physical', label: '<span class="icon icon-cog"></span> 物理+防御', value: 6, desc: '造成 6 点物理伤害，且自身防御力+6', selfDefBuff: 6 }
            ],
            weakness: '物理装甲极厚，捕食打击几乎刮痧。先用捕食打击挂毒，再用腺体脉冲触发毒素发作，无视防御。',
            drop: { type: 'component', id: '纳米破片', chance: 0.6 },
            bpReward: [2, 5]
        },
        MON_CH1_WATCHER: {
            id: 'MON_CH1_WATCHER',
                        icon: 'mon_ch1_watcher',
            image: '../Assets/Monsters/监控者幼体.png',
            name: '监控者幼体',
            race: RACE.EMBER,
            tier: 'common',
            level: 2,
            hp: 30,
            atk: 4,
            def: 3,
            bleedImmune: true,
            intents: [
                { type: 'scan', label: '进程干扰', value: 1, desc: '扫描原体，使其下一回合的器官卡牌费用（进程）全部+1', ramPenalty: 1 }
            ],
            weakness: '优先击杀目标。建议在第一回合保留 3 点进程直接用卡牌将其秒杀。',
            drop: { type: 'component', id: '纳米破片', chance: 0.6 },
            bpReward: [2, 5]
        },

        MON_CH1_AMALGAM: {
            id: 'MON_CH1_AMALGAM',
                        icon: 'mon_ch1_amalgam',
            image: '../Assets/Monsters/变异融合体.png',
            name: '变异融合体',
            race: RACE.MUTANT,
            tier: 'common',
            level: 3,
            hp: 45,
            atk: 14,
            def: 3,
            bleedImmune: true,
            intents: [
                { type: 'physical', label: '<span class="icon icon-sword-clash"></span> 多重撕裂', value: 14, desc: '造成 14 点物理撕裂伤害' }
            ],
            weakness: '多肢体攻击速度快，但个体脆弱。高攻击可快速秒杀。',
            drop: { type: 'component', id: '变异组织', chance: 0.6 },
            bpReward: [3, 6]
        },
        MON_CH1_MOTH: {
            id: 'MON_CH1_MOTH',
                        icon: 'mon_ch1_moth',
            image: '../Assets/Monsters/毒素飞蛾.png',
            name: '毒素飞蛾',
            race: RACE.SWARM,
            tier: 'common',
            level: 3,
            hp: 32,
            atk: 12,
            def: 2,
            intents: [
                { type: 'toxin', label: '<span class="icon icon-poison-gas"></span> 毒粉播撒', value: 12, desc: '播撒毒粉，造成 12 点毒素伤害' }
            ],
            weakness: '极度脆弱，物理攻击一击即可粉碎。',
            drop: { type: 'component', id: '解毒酶结晶', chance: 0.6 },
            bpReward: [3, 6]
        },
        MON_CH1_DRONE: {
            id: 'MON_CH1_DRONE',
                        icon: 'mon_ch1_drone',
            image: '../Assets/Monsters/电弧无人机.png',
            name: '电弧无人机',
            race: RACE.EMBER,
            tier: 'common',
            level: 3,
            hp: 33,
            atk: 8,
            def: 5,
            bleedImmune: true,
            recoilDamage: 5,
            intents: [
                { type: 'electric', label: '<span class="icon icon-lightning-arc"></span> 电击脉冲', value: 8, desc: '释放 8 点电击脉冲伤害' }
            ],
            weakness: '机械外壳薄弱，毒素攻击无视其防御。',
            drop: { type: 'component', id: '纳米破片', chance: 0.6 },
            bpReward: [3, 6]
        },

        MON_CH1_BEE: {
            id: 'MON_CH1_BEE',
                        icon: 'mon_ch1_bee',
            image: '../Assets/Monsters/失控巡逻蜂.png',
            name: '失控巡逻蜂',
            race: RACE.EMBER,
            tier: 'elite',
            level: 6,
            hp: 95,
            atk: 14,
            def: 10,
            bleedImmune: true,
            recoilDamage: 5,
            intents: [
                { type: 'electric', label: '<span class="icon icon-lightning-arc"></span> 高压电弧', value: 14, desc: '释放 14 点高压电弧伤害' }
            ],
            weakness: '电磁过载。玩家释放任何消耗进程的技能时，其生物外壳都会受到 5 点反噬伤害。',
            drop: { type: 'component', id: '高压电缆碎片', chance: 0.4 },
            bpReward: [15, 20]
        },
        MON_CH1_SENTINEL: {
            id: 'MON_CH1_SENTINEL',
                        icon: 'mon_ch1_sentinel',
            image: '../Assets/Monsters/组装哨兵.png',
            name: '组装哨兵',
            race: RACE.EMBER,
            tier: 'elite',
            level: 9,
            hp: 160,
            atk: 32,
            def: 18,
            bleedImmune: true,
            intents: [
                { type: 'charge', label: '<span class="icon icon-targeting"></span> 锁定发射', value: 32, desc: '锁定发射：下回合造成 32 点巨额能量冲击', chargeTurns: 1, immuneToPhysicalCC: true }
            ],
            weakness: '蓄力期间免疫一切物理控制。唯一的解法是使用寄生群落的毒素挂毒，利用毒素发作在蓄力期强行削减其血线。',
            drop: { type: 'component', id: '电磁催化剂', chance: 0.4 },
            bpReward: [15, 20]
        },
        MON_CH1_CORE: {
            id: 'MON_CH1_CORE',
                        icon: 'mon_ch1_core',
            name: '安保系统核心',
            race: RACE.EMBER,
            tier: 'world_boss',
            image: '../Assets/Monsters/安保核心（高能电泳核）.png',
            level: 15,
            hp: 400,
            atk: 25,
            def: 40,
            bleedImmune: true,
            shieldPerTurn: 80,
            intents: [
                { type: 'shield', label: '<span class="icon icon-magic-shield"></span> 高能真菌护盾', value: 200, desc: '每回合开始时获得 200 点高能真菌护盾（最大 HP 的 50%）' }
            ],
            weakness: '机械终极体。护盾未破时一切物理和反伤对其无效。战前装配双专精【电子真菌】触发电荷偏转免进程，囤积上限进程后连续打出腺体脉冲爆破撕裂护盾，方可融毁核心。',
            drop: { type: 'organ', pool: 'MON_CH1_CORE', chance: 1.0 },
            bpReward: [100, 100]
        },
        TRAINING_DUMMY_MUTANT: {
            id: 'TRAINING_DUMMY_MUTANT',
            name: '训练人偶·异变',
            hp: 9999, atk: 0, def: 1,
            race: 'mutant', tier: 'common',
            trainingOnly: true,
            intents: [{ type: 'dummy', label: '待命中...' }]
        },
        TRAINING_DUMMY_SWARM: {
            id: 'TRAINING_DUMMY_SWARM',
            name: '训练人偶·寄生',
            hp: 9999, atk: 0, def: 1,
            race: 'swarm', tier: 'common',
            trainingOnly: true,
            intents: [{ type: 'dummy', label: '待命中...' }]
        },
        TRAINING_DUMMY_EMBER: {
            id: 'TRAINING_DUMMY_EMBER',
            name: '训练人偶·机械',
            hp: 9999, atk: 0, def: 1,
            race: 'ember', tier: 'common',
            trainingOnly: true,
            intents: [{ type: 'dummy', label: '待命中...' }]
        },
        MON_CH2_WORM: {
            id: 'MON_CH2_WORM', name: '腐肉蠕虫',
                        icon: 'mon_ch2_worm',
            image: '../Assets/Monsters/腐肉蠕虫.png',
            race: RACE.SWARM, tier: 'common', level: 2,
            hp: 35, atk: 6, def: 1,
            intents: [
                { type: 'physical', label: '<span class="icon icon-leeching-worm"></span> 酸液喷射', value: 6, desc: '酸液腐蚀，造成 6 点伤害并附带 2 回合中毒', poison: { duration: 2, damage: 3 } }
            ],
            weakness: '攻低血薄，中毒可被 POT_ANTIDOTE 解除。',
            drop: { type: 'component', id: '毒囊材料', chance: 0.6 },
            bpReward: [2, 5]
        },
        MON_CH2_CAMERA: {
            id: 'MON_CH2_CAMERA', name: '监控摄像头',
                        icon: 'mon_ch2_camera',
            image: '../Assets/Monsters/监控摄像头.png',
            race: RACE.EMBER, tier: 'common', level: 2,
            hp: 28, atk: 7, def: 3,
            intents: [
                { type: 'scan', label: '<span class="icon icon-radar-sweep"></span> 扫描标记', value: 0, desc: '扫描玩家弱点，下回合敌人伤害 +30%', ramPenalty: 1 }
            ],
            weakness: '优先秒掉，避免它给其他怪物增益。涂电磁短路涂层克机械。',
            drop: { type: 'component', id: '纳米破片', chance: 0.5 },
            bpReward: [2, 5]
        },
        MON_CH2_GROWTH: {
            id: 'MON_CH2_GROWTH', name: '骨骼增生体',
                        icon: 'mon_ch2_growth',
            image: '../Assets/Monsters/骨骼增生体.png',
            race: RACE.MUTANT, tier: 'common', level: 3,
            hp: 60, atk: 10, def: 8,
            bleedImmune: true,
            intents: [
                { type: 'shield', label: '<span class="icon icon-magic-shield"></span> 骨甲再生', value: 8, desc: '增生骨板，获得 8 点额外防御' }
            ],
            weakness: '高防低攻，腺体脉冲连招可无视其护甲。',
            drop: { type: 'component', id: '变异组织', chance: 0.5 },
            bpReward: [3, 6]
        },
        MON_CH2_PARASITE: {
            id: 'MON_CH2_PARASITE', name: '神经寄生虫',
                        icon: 'mon_ch2_parasite',
            image: '../Assets/Monsters/神经寄生虫.png',
            race: RACE.SWARM, tier: 'common', level: 3,
            hp: 40, atk: 9, def: 2,
            intents: [
                { type: 'physical', label: '<span class="icon icon-leeching-worm"></span> 神经穿刺', value: 9, desc: '精准穿刺神经节点，造成 9 点伤害', bleed: { duration: 3, damage: 3 } },
                { type: 'stun', label: '<span class="icon icon-time-trap"></span> 神经麻痹', value: 0, desc: '注入神经毒素，玩家下回合技能消耗 +2' }
            ],
            weakness: '攻速快但血薄，生物表皮护盾可有效格挡。',
            drop: { type: 'component', id: '毒囊材料', chance: 0.5 },
            bpReward: [3, 8]
        },
        MON_CH2_VULTURE: {
            id: 'MON_CH2_VULTURE', name: '数据秃鹫',
                        icon: 'mon_ch2_vulture',
            image: '../Assets/Monsters/数据秃鹫.png',
            race: RACE.EMBER, tier: 'common', level: 4,
            hp: 45, atk: 11, def: 4,
            intents: [
                { type: 'physical', label: '<span class="icon icon-targeting"></span> 精确狙击', value: 11, desc: '高精度电磁脉冲，造成 11 点穿甲伤害', armorPen: 0.3 }
            ],
            weakness: '穿甲攻击无视部分防御，需堆高生命上限硬接。',
            drop: { type: 'component', id: '高压电缆碎片', chance: 0.4 },
            bpReward: [5, 10]
        },
        MON_CH2_GHOST: {
            id: 'MON_CH2_GHOST', name: '数据幽灵',
                        icon: 'mon_ch2_ghost',
            image: '../Assets/Monsters/数据幽灵.png',
            race: RACE.EMBER, tier: 'elite', level: 6,
            hp: 110, atk: 18, def: 6,
            dodgeChance: 0.3,
            intents: [
                { type: 'electric', label: '<span class="icon icon-lightning-arc"></span> 电弧冲击', value: 18, desc: '化成电弧穿透防御，造成 18 点电离伤害', ignoreDef: true },
                { type: 'stun', label: '<span class="icon icon-time-trap"></span> 相位干扰', value: 0, desc: '短暂进入亚空间，完全闪避下次攻击', dodge: true }
            ],
            weakness: '闪避高但血少，终焉母核被动可清除闪避。腺体脉冲崩解连招对其极其有效。',
            drop: { type: 'component', id: '神经突触结', chance: 0.5 },
            bpReward: [20, 30]
        },
        MON_CH2_BEAST: {
            id: 'MON_CH2_BEAST', name: '毒雾巨兽',
                        icon: 'mon_ch2_beast',
            image: '../Assets/Monsters/毒雾巨兽.png',
            race: RACE.MUTANT, tier: 'elite', level: 7,
            hp: 180, atk: 22, def: 12,
            bleedImmune: true,
            intents: [
                { type: 'physical', label: '<span class="icon icon-fanged-skull"></span> 剧毒撕咬', value: 22, desc: '注入高浓度毒液，造成 22 点伤害 + 3 回合猛毒', poison: { duration: 3, damage: 6 } },
                { type: 'physical', label: '<span class="icon icon-hazard-sign"></span> 毒雾喷吐', value: 14, desc: '全场 AOE，对所有目标造成 14 点毒素伤害', aoe: true }
            ],
            weakness: '体型巨大但出招极慢，可在蓄力期间用神经阻断打断。涂细胞壁溶解酶涂层收益极高。',
            drop: { type: 'component', id: '异变肌肉束', chance: 0.5 },
            bpReward: [25, 35]
        },
        MON_CH2_BROODMOTHER: {
            id: 'MON_CH2_BROODMOTHER', name: '腐化母体',
                        icon: 'mon_ch2_broodmother',
            image: '../Assets/Monsters/腐化母体.png',
            race: RACE.SWARM, tier: 'elite', level: 7,
            hp: 150, atk: 16, def: 10,
            intents: [
                { type: 'physical', label: '<span class="icon icon-egg-clutch"></span> 孵化突袭', value: 20, desc: '释放体内寄生幼虫，造成 20 点伤害', spawn: { count: 1, id: 'MON_CH1_LARVA' } },
                { type: 'shield', label: '<span class="icon icon-magic-shield"></span> 茧壳防御', value: 15, desc: '分泌生物质获得 15 点护盾' }
            ],
            weakness: '会召唤幼虫群，优先使用腺体脉冲 AOE 清理。涂生物自溶催化剂免疫毒素反噬。',
            drop: { type: 'component', id: '活性孢子', chance: 0.5 },
            bpReward: [25, 40]
        },
        MON_CH2_CANNON: {
            id: 'MON_CH2_CANNON', name: '脉冲炮台',
                        icon: 'mon_ch2_cannon',
            image: '../Assets/Monsters/脉冲炮台.png',
            race: RACE.EMBER, tier: 'elite', level: 8,
            hp: 130, atk: 26, def: 15,
            intents: [
                { type: 'charge', label: '<span class="icon icon-targeting"></span> 充能锁定', value: 35, desc: '蓄力充能 1 回合后释放高能脉冲，造成 35 点真实伤害', chargeTurns: 1 }
            ],
            weakness: '蓄力期间静止不动，防御力翻倍但可用腺体脉冲崩解连招破甲。逃命吧。',
            drop: { type: 'component', id: '纳米破片', chance: 0.6 },
            bpReward: [30, 45]
        },
        MON_CH2_ABOMINATION: {
            id: 'MON_CH2_ABOMINATION', name: '变异憎恶',
                        icon: 'mon_ch2_abomination',
            image: '../Assets/Monsters/终焉母核.png',
            race: RACE.MUTANT, tier: 'elite', level: 8,
            hp: 240, atk: 30, def: 18,
            thornsPercent: 0.15,
            bleedImmune: true,
            intents: [
                { type: 'physical', label: '<span class="icon icon-spiked-mace"></span> 毁灭重击', value: 30, desc: '造成 30 点物理伤害，附带 15% 反伤' },
                { type: 'enrage', label: '<span class="icon icon-enrage"></span> 基因狂暴', value: 30, desc: 'HP 低于 50% 时触发狂怒，攻击力翻倍' }
            ],
            weakness: '反伤极高，建议挂毒后用腺体脉冲远程引爆吸血对抗。忌用捕食打击正面硬刚。',
            drop: { type: 'component', id: '变异组织', chance: 0.7 },
            bpReward: [35, 50]
        }
    };

    return { RACE: RACE, RACE_LORE: RACE_LORE, MONSTERS: MONSTERS };
})();
