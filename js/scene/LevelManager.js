import { CONFIG } from '../utils/Constants.js';

export class LevelManager {
    constructor() {
        this.level = 1;
        this.waveTotalEnemies = 0;
        this.waveKilledEnemies = 0;
        this.startWave();
    }

    startWave() {
        this.waveTotalEnemies = this.getEnemyCount();
        this.waveKilledEnemies = 0;
    }

    advanceLevel() {
        this.level++;
        this.startWave();
    }

    registerKill() {
        this.waveKilledEnemies = Math.min(
            this.waveKilledEnemies + 1,
            this.waveTotalEnemies
        );
    }

    getEnemyCount() {
        return Math.min(
            CONFIG.LEVELS.BASE_ENEMY_COUNT + this.level * CONFIG.LEVELS.ENEMIES_PER_LEVEL,
            CONFIG.LEVELS.MAX_ENEMY_COUNT
        );
    }

    getProgress() {
        if (this.waveTotalEnemies <= 0) return 0;
        return this.waveKilledEnemies / this.waveTotalEnemies;
    }

    getGroupSizeLimit() {
        if (this.level <= 1) return 1;
        if (this.level <= 3) return 2;
        return CONFIG.LEVELS.MAX_GROUP_SIZE;
    }

    getDifficulty() {
        const levelIndex = this.level - 1;

        return {
            health: this.level >= 4 ? CONFIG.Enemy.HEALTH + 1 : CONFIG.Enemy.HEALTH,
            moveSpeedMultiplier: 1 + levelIndex * 0.05,
            fireCooldownMultiplier: Math.max(0.55, 1 - levelIndex * 0.05),
            detectionRangeMultiplier: 1 + levelIndex * 0.06,
            startsAlertedChance: this.level >= 5 ? Math.min(0.35, levelIndex * 0.05) : 0,
            groupAlertRadius: CONFIG.LEVELS.GROUP_ALERT_RADIUS + levelIndex * 15,
            shotNoiseRadius: CONFIG.LEVELS.SHOT_NOISE_RADIUS + levelIndex * 10,
        };
    }
}
