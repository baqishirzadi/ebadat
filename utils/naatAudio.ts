import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

let configured = false;

export async function configureNaatAudioMode(): Promise<void> {
  if (configured) return;
  await Audio.setAudioModeAsync({
    staysActiveInBackground: true,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
    interruptionModeIOS: InterruptionModeIOS.DoNotMix,
    interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    playThroughEarpieceAndroid: false,
  });
  configured = true;
}

export function resetNaatAudioMode(): void {
  configured = false;
}
