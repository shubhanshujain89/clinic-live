export interface AverageWaitSummary {
  averageWaitMinutes: number;
  label: string;
  suffix: string;
}

export function getAverageWaitSummary(
  doctorStatus: string | undefined,
  waitingTokens: Array<{ createdAt?: string | null }>,
): AverageWaitSummary {
  if (doctorStatus !== 'IN') {
    return {
      averageWaitMinutes: 0,
      label: 'Doctor not in yet',
      suffix: '',
    };
  }

  if (!waitingTokens.length) {
    return {
      averageWaitMinutes: 0,
      label: '0',
      suffix: 'mins',
    };
  }

  const averageWaitMinutes = Number((waitingTokens.reduce((sum, token) => {
    const tokenCreatedAt = token.createdAt ? new Date(token.createdAt).getTime() : Date.now();
    const elapsedMinutes = Math.max(0, (Date.now() - tokenCreatedAt) / 60000);
    return sum + elapsedMinutes;
  }, 0) / waitingTokens.length).toFixed(1));

  return {
    averageWaitMinutes,
    label: String(averageWaitMinutes),
    suffix: 'mins',
  };
}
