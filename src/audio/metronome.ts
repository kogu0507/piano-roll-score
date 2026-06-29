import {
  METRONOME_CLICK_DURATION_SECONDS,
  METRONOME_SCHEDULE_LOOKAHEAD_SECONDS,
  METRONOME_SCHEDULER_INTERVAL_MS,
  calculateMetronomeIntervalSeconds,
  classifyMetronomeBeat,
  getMetronomeFrequency,
  normalizeMetronomeVolume,
} from "../core/metronome-timing";

export interface MetronomePlaybackConfig {
  readonly enabled: boolean;
  readonly bpm: number;
  readonly playbackRate: number;
  readonly beatsPerMeasure: number;
  readonly volume: number;
  readonly startBeatIndex: number;
  readonly startDelaySeconds: number;
  readonly maxBeatCount?: number;
}

export interface MetronomeScheduler {
  start: (config: MetronomePlaybackConfig) => void;
  stop: () => void;
}

type AudioContextConstructor = new () => AudioContext;

interface WindowWithWebkitAudioContext extends Window {
  readonly webkitAudioContext?: AudioContextConstructor;
}

export class WebAudioMetronome implements MetronomeScheduler {
  private audioContext: AudioContext | undefined;
  private timerId: number | undefined;
  private readonly scheduledNodes = new Set<OscillatorNode>();
  private config: MetronomePlaybackConfig | undefined;
  private nextBeatTimeSeconds = 0;
  private scheduledBeatCount = 0;
  private running = false;

  start(config: MetronomePlaybackConfig): void {
    this.stop();
    this.config = config;

    if (!config.enabled || normalizeMetronomeVolume(config.volume) <= 0) {
      return;
    }

    this.running = true;
    void this.ensureAudioContext()
      .then((audioContext) => {
        if (!this.running || this.config !== config) {
          return;
        }

        this.nextBeatTimeSeconds =
          audioContext.currentTime + Math.max(0, config.startDelaySeconds);
        this.scheduledBeatCount = 0;
        this.scheduleAhead();
        this.timerId = window.setInterval(() => {
          this.scheduleAhead();
        }, METRONOME_SCHEDULER_INTERVAL_MS);
      })
      .catch((error: unknown) => {
        console.warn("メトロノーム音を開始できません。", error);
        this.stop();
      });
  }

  stop(): void {
    this.running = false;

    if (this.timerId !== undefined) {
      window.clearInterval(this.timerId);
      this.timerId = undefined;
    }

    const now = this.audioContext?.currentTime ?? 0;
    this.scheduledNodes.forEach((node) => {
      try {
        node.stop(now);
      } catch {
        // すでに停止済みのノードは無視する。
      }
      node.disconnect();
    });
    this.scheduledNodes.clear();
  }

  private async ensureAudioContext(): Promise<AudioContext> {
    if (this.audioContext === undefined) {
      const AudioContextClass =
        window.AudioContext ??
        (window as WindowWithWebkitAudioContext).webkitAudioContext;

      if (AudioContextClass === undefined) {
        throw new Error("このブラウザはWeb Audio APIに対応していません。");
      }

      this.audioContext = new AudioContextClass();
    }

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    return this.audioContext;
  }

  private scheduleAhead(): void {
    if (
      !this.running ||
      this.audioContext === undefined ||
      this.config === undefined
    ) {
      return;
    }

    const scheduleUntil =
      this.audioContext.currentTime + METRONOME_SCHEDULE_LOOKAHEAD_SECONDS;
    const intervalSeconds = calculateMetronomeIntervalSeconds(
      this.config.bpm,
      this.config.playbackRate,
    );

    while (
      this.nextBeatTimeSeconds <= scheduleUntil &&
      (this.config.maxBeatCount === undefined ||
        this.scheduledBeatCount < this.config.maxBeatCount)
    ) {
      const beatIndex = this.config.startBeatIndex + this.scheduledBeatCount;
      const kind = classifyMetronomeBeat(
        beatIndex,
        this.config.beatsPerMeasure,
      );

      this.scheduleClick(
        this.nextBeatTimeSeconds,
        getMetronomeFrequency(kind),
        normalizeMetronomeVolume(this.config.volume),
      );
      this.scheduledBeatCount += 1;
      this.nextBeatTimeSeconds += intervalSeconds;
    }

    if (
      this.config.maxBeatCount !== undefined &&
      this.scheduledBeatCount >= this.config.maxBeatCount
    ) {
      this.stopTimerOnly();
    }
  }

  private scheduleClick(
    timeSeconds: number,
    frequency: number,
    volume: number,
  ): void {
    if (this.audioContext === undefined || volume <= 0) {
      return;
    }

    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const clickVolume = volume * 0.2;
    const stopTime = timeSeconds + METRONOME_CLICK_DURATION_SECONDS;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, timeSeconds);
    gain.gain.setValueAtTime(0.0001, timeSeconds);
    gain.gain.exponentialRampToValueAtTime(clickVolume, timeSeconds + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, stopTime);
    oscillator.connect(gain).connect(this.audioContext.destination);
    oscillator.start(timeSeconds);
    oscillator.stop(stopTime);
    oscillator.addEventListener("ended", () => {
      this.scheduledNodes.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    });
    this.scheduledNodes.add(oscillator);
  }

  private stopTimerOnly(): void {
    if (this.timerId !== undefined) {
      window.clearInterval(this.timerId);
      this.timerId = undefined;
    }
  }
}
