// js/rewards.js

import { storage } from './storage.js';
import { APP_CONFIG } from './config.js';

export const rewardSystem = {
    init() {
        if (typeof storage?.state?.rewardPoints !== 'number') {
            storage.state.rewardPoints = 0;
        }

        if (typeof storage?.state?.adsDisabledUntil !== 'number') {
            storage.state.adsDisabledUntil = 0;
        }

        storage.save();
    },

    getPoints() {
        return Number(storage?.state?.rewardPoints) || 0;
    },

    getAdsDisabledUntil() {
        return Number(storage?.state?.adsDisabledUntil) || 0;
    },

    isAdFreeActive() {
        return this.getAdsDisabledUntil() > Date.now();
    },

    getRemainingPoints() {
        const remaining = APP_CONFIG.REWARDS.POINTS_FOR_ONE_DAY_AD_FREE - this.getPoints();
        return Math.max(remaining, 0);
    },

    addPoints(points = APP_CONFIG.REWARDS.POINTS_PER_AD) {
        const safePoints = Number(points) || 0;
        if (safePoints <= 0) return false;

        storage.state.rewardPoints = this.getPoints() + safePoints;
        storage.save();

        if (storage.state.rewardPoints >= APP_CONFIG.REWARDS.POINTS_FOR_ONE_DAY_AD_FREE) {
            this.redeemOneDayAdFree();
        }

        return true;
    },

    redeemOneDayAdFree() {
        if (this.getPoints() < APP_CONFIG.REWARDS.POINTS_FOR_ONE_DAY_AD_FREE) {
            return false;
        }

        storage.state.rewardPoints =
            this.getPoints() - APP_CONFIG.REWARDS.POINTS_FOR_ONE_DAY_AD_FREE;

        storage.state.adsDisabledUntil =
            Date.now() + APP_CONFIG.REWARDS.AD_FREE_DURATION_MS;

        storage.save();
        return true;
    },

    getAdFreeStatusText() {
        const until = this.getAdsDisabledUntil();
        if (!until || until <= Date.now()) return '';

        try {
            return `الإعلانات متوقفة حتى ${new Date(until).toLocaleString('ar-EG')}`;
        } catch {
            return 'الإعلانات متوقفة مؤقتًا';
        }
    }
};