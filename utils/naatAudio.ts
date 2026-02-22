import { Audio } from 'expo-av';

let configured = false;

export async function configureNaatAudioMode(): Promise<void> {
  if (configured) return;
  await Audio.setAudioModeAsync({
    staysActiveInBackground: true,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
    interruptionModeIOS: Audio.InterruptionModeIOS.DoNotMix,
    interruptionModeAndroid: Audio.InterruptionModeAndroid.DoNotMix,
    playThroughEarpieceAndroid: false,
  });
  configured = true;
}

export function resetNaatAudioMode(): void {
  configured = false;
}
