'use client';

import { useCallback, useRef } from 'react';

type FeedbackType = 'success' | 'error' | 'warning';

const SOUNDS: Record<FeedbackType, { frequency: number; duration: number; pattern: number[] }> = {
    success: { frequency: 880, duration: 120, pattern: [1] },       // Bíp ngắn 1 lần
    error: { frequency: 440, duration: 200, pattern: [1, 0.8, 1] }, // Tít tít tít
    warning: { frequency: 660, duration: 150, pattern: [1, 1] },    // Bíp bíp
};

const VIBRATION: Record<FeedbackType, number[]> = {
    success: [50],           // Rung nhẹ
    error: [100, 50, 100, 50, 100], // Rung mạnh kéo dài
    warning: [80, 40, 80],  // Rung vừa
};

/**
 * Hook cung cấp phản hồi đa giác quan (Multi-sensory Feedback)
 * - Rung (Haptic) qua Vibration API
 * - Âm thanh (Beep) qua Web Audio API
 * - Hiệu ứng viền (Border flash) qua CSS class
 */
export function useFloorFeedback() {
    const audioCtxRef = useRef<AudioContext | null>(null);

    const getAudioCtx = useCallback(() => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new AudioContext();
        }
        return audioCtxRef.current;
    }, []);

    const playBeep = useCallback((type: FeedbackType) => {
        try {
            const ctx = getAudioCtx();
            const { frequency, duration, pattern } = SOUNDS[type];

            pattern.forEach((vol, i) => {
                const oscillator = ctx.createOscillator();
                const gainNode = ctx.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(ctx.destination);
                oscillator.frequency.value = frequency;
                oscillator.type = type === 'error' ? 'square' : 'sine';
                gainNode.gain.value = vol * 0.3;
                const offset = i * (duration + 80) / 1000;
                oscillator.start(ctx.currentTime + offset);
                oscillator.stop(ctx.currentTime + offset + duration / 1000);
            });
        } catch {
            // Audio context not available
        }
    }, [getAudioCtx]);

    const vibrate = useCallback((type: FeedbackType) => {
        try {
            if (navigator.vibrate) {
                navigator.vibrate(VIBRATION[type]);
            }
        } catch {
            // Vibration not available
        }
    }, []);

    /**
     * Kích hoạt phản hồi đa giác quan
     */
    const trigger = useCallback((type: FeedbackType) => {
        playBeep(type);
        vibrate(type);
    }, [playBeep, vibrate]);

    return { trigger, playBeep, vibrate };
}
