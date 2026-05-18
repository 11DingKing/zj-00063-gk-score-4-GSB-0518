import { evaluate, erf } from "mathjs";

export function calculateWrittenTotal(
  xingceScore: number,
  shenlunScore: number,
  formula: string,
): number {
  const xingce = xingceScore ?? 0;
  const shenlun = shenlunScore ?? 0;
  try {
    const result = evaluate(formula, {
      xingce,
      shenlun,
    });
    return Number(result.toFixed(2));
  } catch (error) {
    return Number(((xingce + shenlun) / 2).toFixed(2));
  }
}

export function calculateTotalScore(
  writtenTotal: number,
  interviewScore: number | null,
  formula: string,
): number | null {
  if (interviewScore === null) return null;
  try {
    const result = evaluate(formula, {
      written: writtenTotal,
      interview: interviewScore,
    });
    return Number(result.toFixed(2));
  } catch (error) {
    return Number(((writtenTotal + interviewScore) / 2).toFixed(2));
  }
}

export function maskName(name: string): string {
  if (name.length <= 1) return name;
  if (name.length === 2) return name[0] + "*";
  return name[0] + "*".repeat(name.length - 2) + name[name.length - 1];
}

export function calculateStatistics(scores: number[]) {
  if (scores.length === 0) {
    return { max: 0, min: 0, avg: 0, median: 0, std: 0 };
  }

  const sorted = [...scores].sort((a, b) => a - b);
  const max = sorted[sorted.length - 1];
  const min = sorted[0];
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  const variance =
    scores.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / (scores.length - 1);
  const std = Math.sqrt(variance);

  return {
    max: Number(max.toFixed(2)),
    min: Number(min.toFixed(2)),
    avg: Number(avg.toFixed(2)),
    median: Number(median.toFixed(2)),
    std: Number(std.toFixed(2)),
  };
}

function normalCDF(x: number): number {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

export function estimateRankAndProbability(
  userScore: number,
  positionScores: number[],
): { estimatedRank: number; interviewProbability: number } {
  if (positionScores.length === 0) {
    return { estimatedRank: 1, interviewProbability: 1 };
  }

  const stats = calculateStatistics(positionScores);
  const zScore = stats.std > 0 ? (userScore - stats.avg) / stats.std : 0;

  const percentile = normalCDF(zScore);
  const estimatedRank =
    Math.round(positionScores.length * (1 - percentile)) + 1;

  const interviewSlots = Math.round(positionScores.length * 0.3);
  const interviewThresholdZ =
    stats.std > 0
      ? (stats.avg +
          ((positionScores.length - interviewSlots) / positionScores.length) *
            stats.std -
          stats.avg) /
        stats.std
      : 0;
  const interviewProbability = 1 - normalCDF(interviewThresholdZ - zScore);

  return {
    estimatedRank: Math.max(1, estimatedRank),
    interviewProbability: Number(
      Math.min(1, Math.max(0, interviewProbability)).toFixed(2),
    ),
  };
}
