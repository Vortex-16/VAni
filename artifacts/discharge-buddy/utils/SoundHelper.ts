import { Audio } from 'expo-av';

const SOUND_URL = 'https://www.soundjay.com/buttons/sounds/button-37.mp3'; // Fast, reliable "ting"

class SoundHelper {
  private static instance: SoundHelper;
  private sound: Audio.Sound | null = null;

  private constructor() {}

  public static getInstance(): SoundHelper {
    if (!SoundHelper.instance) {
      SoundHelper.instance = new SoundHelper();
    }
    return SoundHelper.instance;
  }

  public async load() {
    try {
      if (this.sound) return;
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/universfield-new-notification-057-494255.mp3.mpeg'),
        { volume: 1.0 }
      );
      this.sound = sound;
    } catch (e) {
      console.warn("Sound load failed", e);
    }
  }

  public async playTing() {
    try {
      if (!this.sound) {
        await this.load();
      }
      
      if (this.sound) {
        await this.sound.setPositionAsync(0);
        await this.sound.playAsync();
      }
    } catch (error) {
      console.warn('Failed to play success sound', error);
    }
  }
}

export const soundHelper = SoundHelper.getInstance();
