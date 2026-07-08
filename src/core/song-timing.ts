import type { Song, SongNote } from "../schema/song-schema";

export const DEFAULT_PICKUP_BEATS = 0;

export function normalizePickupBeats(pickupBeats: number | undefined): number {
  if (pickupBeats === undefined || !Number.isFinite(pickupBeats)) {
    return DEFAULT_PICKUP_BEATS;
  }

  return Math.max(DEFAULT_PICKUP_BEATS, pickupBeats);
}

export function scoreTimeToPlaybackTime(
  scoreTime: number,
  pickupBeats: number | undefined,
): number {
  return scoreTime + normalizePickupBeats(pickupBeats);
}

export function playbackTimeToScoreTime(
  playbackTime: number,
  pickupBeats: number | undefined,
): number {
  return playbackTime - normalizePickupBeats(pickupBeats);
}

export function calculateNotePlaybackTime(
  note: Pick<SongNote, "time">,
  pickupBeats: number | undefined,
): number {
  return scoreTimeToPlaybackTime(note.time, pickupBeats);
}

export function calculateNotePlaybackEndTime(
  note: Pick<SongNote, "time" | "duration">,
  pickupBeats: number | undefined,
): number {
  return calculateNotePlaybackTime(note, pickupBeats) + note.duration;
}

export function calculateSongPlaybackEndBeat(
  song: Pick<Song, "notes" | "pickupBeats">,
): number {
  return Math.max(
    DEFAULT_PICKUP_BEATS,
    ...song.notes.map((note) =>
      calculateNotePlaybackEndTime(note, song.pickupBeats),
    ),
  );
}
