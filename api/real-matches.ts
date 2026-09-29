/**
 * Real Bookmaker Line Fetcher
 * Collects up to 200–500 real events of the day directly from official feeds:
 * 1. BC Marathon (legal line in Russian with exact matches, times, and leagues)
 * 2. LiveScore public API (global matches for soccer, hockey, basketball, tennis)
 */

import { translateTeamNameToRussian, translateMatchNameToRussian } from './russian-names';

export interface RealMatchItem {
  id: string;
  matchName: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  time: string; // HH:MM
  sport: string;
  source: string;
  tier?: number;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export function timeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

export function isTimeInRange(matchTime: string, startTimeStr?: string, endTimeStr?: string): boolean {
  if (!startTimeStr && !endTimeStr) return true;
  const matchMin = timeToMinutes(matchTime);
  if (matchMin === null) return true;

  const startMin = startTimeStr ? timeToMinutes(startTimeStr) : 0;
  const endMin = endTimeStr ? timeToMinutes(endTimeStr) : 1439;

  if (startMin !== null && endMin !== null) {
    if (startMin <= endMin) {
      return matchMin >= startMin && matchMin <= endMin;
    } else {
      return matchMin >= startMin || matchMin <= endMin;
    }
  }
  return true;
}

// Calculate tournament priority tier (lower number = higher priority)
function getLeagueTier(league: string): number {
  const l = league.toLowerCase();
  if (
    l.includes('champions league') ||
    l.includes('лига чемпионов') ||
    l.includes('nations league') ||
    l.includes('лига наций') ||
    l.includes('premier league') ||
    l.includes('апл') ||
    l.includes('англия') ||
    l.includes('la liga') ||
    l.includes('испания') ||
    l.includes('serie a') ||
    l.includes('италия') ||
    l.includes('bundesliga') ||
    l.includes('германия') ||
    l.includes('ligue 1') ||
    l.includes('франция') ||
    l.includes('рпл') ||
    l.includes('rpl') ||
    l.includes('россия') ||
    l.includes('khl') ||
    l.includes('кхл') ||
    l.includes('nhl') ||
    l.includes('нхл') ||
    l.includes('euroleague') ||
    l.includes('евролига') ||
    l.includes('nba') ||
    l.includes('нба')
  ) {
    return 1;
  }
  if (
    l.includes('europa') ||
    l.includes('conference') ||
    l.includes('championship') ||
    l.includes('eredivisie') ||
    l.includes('primeira') ||
    l.includes('vhl') ||
    l.includes('вхл') ||
    l.includes('vtb') ||
    l.includes('acb') ||
    l.includes('atp') ||
    l.includes('wta')
  ) {
    return 2;
  }
  return 3;
}

const ruMonthsMap: Record<string, number> = {
  янв: 1,
  фев: 2,
  мар: 3,
  апр: 4,
  май: 5,
  июн: 6,
  июл: 7,
  авг: 8,
  сен: 9,
  окт: 10,
  ноя: 11,
  дек: 12,
};

/**
 * Fetch matches from BC Marathon
 */
async function fetchFromMarathon(sportKey: string, targetDateStr: string): Promise<RealMatchItem[]> {
  const sportMap: Record<string, { id: string; name: string }> = {
    football: { id: '11', name: 'Футбол' },
    hockey: { id: '537', name: 'Хоккей' },
    basketball: { id: '43658', name: 'Баскетбол' },
    tennis: { id: '2373', name: 'Теннис' },
  };

  const sportsToFetch =
    sportKey === 'all'
      ? Object.values(sportMap)
      : [sportMap[sportKey] || sportMap.football];

  const allMatches: RealMatchItem[] = [];

  const [tYear, tMonth, tDay] = targetDateStr.split('-').map(Number);
  const nowMsk = new Date();
  const mskDateStr = nowMsk.toLocaleDateString('en-CA', { timeZone: 'Europe/Moscow' });
  const isTargetToday = targetDateStr === mskDateStr;

  for (const cfg of sportsToFetch) {
    try {
      const periodParam = isTargetToday ? '?period=TODAY' : '?period=24HR';
      const url = `https://www.marathonbet.ru/su/popular/${encodeURIComponent(cfg.name)}+-+${cfg.id}${periodParam}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(4500),
      });

      if (!res.ok) continue;
      const html = await res.text();

      const regex =
        /data-event-name="([^"]+)"[\s\S]*?data-event-path="([^"]+)"([\s\S]*?)(?=data-event-name="|$)/g;

      for (const m of html.matchAll(regex)) {
        const rawName = m[1]?.trim();
        if (!rawName) continue;

        const path = decodeURIComponent((m[2] || '').replace(/\+/g, ' '));
        const chunk = m[3] || '';

        const timeMatch = chunk.match(/class="date-wrapper">([^<]+)<\/div>/);
        const rawTime = timeMatch ? timeMatch[1].trim() : '';

        // Strict date check for Marathon line
        const dateMatch = rawTime.match(/(\d{1,2})\s+([а-яё]{3})/i);
        const cleanTimeMatch = rawTime.match(/(\d{1,2}:\d{2})/);
        const cleanTime = cleanTimeMatch ? cleanTimeMatch[1] : '';

        if (dateMatch) {
          const day = parseInt(dateMatch[1], 10);
          const monthName = dateMatch[2].toLowerCase();
          const month = ruMonthsMap[monthName];
          if (!month || day !== tDay || month !== tMonth) {
            // Event is on another date -> strictly ignore
            continue;
          }
        } else if (cleanTime) {
          // If only time is shown, Marathon event is scheduled for today
          if (!isTargetToday) {
            continue;
          }
        } else {
          continue;
        }

        let teamNames: string[] = [];
        const jsonMatch = chunk.match(/data-json="([^"]+)"/);
        if (jsonMatch) {
          try {
            const decoded = jsonMatch[1]
              .replace(/&quot;/g, '"')
              .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
            const parsed = JSON.parse(decoded);
            if (Array.isArray(parsed.teamNames)) {
              teamNames = parsed.teamNames;
            }
          } catch {}
        }

        const parts = rawName.split(/\s*-\s*|\s+vs\.?\s+/i);
        const rawHome = (teamNames[0] || parts[0] || '').trim();
        const rawAway = (teamNames[1] || parts[1] || '').trim();
        if (!rawHome || !rawAway) continue;

        const homeTeam = translateTeamNameToRussian(rawHome);
        const awayTeam = translateTeamNameToRussian(rawAway);

        const pathSegments = path.split('/');
        let league = pathSegments.slice(2, -1).join(' • ') || pathSegments[1] || cfg.name;
        league = league.replace(/\+/g, ' ').trim();

        allMatches.push({
          id: `bk-${allMatches.length + 1}-${homeTeam.slice(0, 3)}`,
          matchName: `${homeTeam} — ${awayTeam}`,
          homeTeam,
          awayTeam,
          league,
          time: cleanTime || '19:00',
          sport: cfg.name,
          source: 'Линия БК Марафон / Фонбет',
          tier: getLeagueTier(league),
        });
      }
    } catch (err: any) {
      console.warn(`Marathon fetch failed for ${cfg.name}:`, err?.message || err);
    }
  }

  return allMatches;
}

/**
 * Fetch matches from LiveScore public API
 */
async function fetchFromLiveScore(sportKey: string, dateStr: string): Promise<RealMatchItem[]> {
  const sportSlugs: Record<string, string> = {
    football: 'soccer',
    hockey: 'hockey',
    basketball: 'basketball',
    tennis: 'tennis',
  };

  const slugsToFetch =
    sportKey === 'all'
      ? ['soccer', 'hockey', 'basketball', 'tennis']
      : [sportSlugs[sportKey] || 'soccer'];

  const formattedDate = dateStr.replace(/-/g, '');
  const allMatches: RealMatchItem[] = [];

  const promises = slugsToFetch.map(async (slug) => {
    try {
      const url = `https://prod-public-api.livescore.com/v1/api/app/date/${slug}/${formattedDate}/3`;
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) return [];
      const data = await res.json();
      const list: RealMatchItem[] = [];

      for (const stage of data.Stages || []) {
        const league = `${stage.Cnm || ''} • ${stage.Snm || ''}`.trim().replace(/^•\s*|\s*•$/g, '');
        for (const ev of stage.Events || []) {
          const rawHome = ev.T1?.[0]?.Nm?.trim();
          const rawAway = ev.T2?.[0]?.Nm?.trim();
          if (!rawHome || !rawAway) continue;

          // Strictly verify event start date
          if (!ev.Esd || String(ev.Esd).length < 12) continue;
          const esdStr = String(ev.Esd);
          const eventDate = esdStr.slice(0, 8);
          if (eventDate !== formattedDate) {
            // Event date differs from target date -> strictly ignore
            continue;
          }

          const time = `${esdStr.slice(8, 10)}:${esdStr.slice(10, 12)}`;
          const homeTeam = translateTeamNameToRussian(rawHome);
          const awayTeam = translateTeamNameToRussian(rawAway);

          list.push({
            id: `ls-${ev.Eid || list.length + 1}`,
            matchName: `${homeTeam} — ${awayTeam}`,
            homeTeam,
            awayTeam,
            league: league || 'Международный турнир',
            time: time,
            sport: slug === 'soccer' ? 'football' : slug,
            source: 'LiveScore Global Feed',
            tier: getLeagueTier(league),
          });
        }
      }
      return list;
    } catch (err: any) {
      console.warn(`LiveScore fetch failed for ${slug}:`, err?.message || err);
      return [];
    }
  });

  const settled = await Promise.all(promises);
  for (const group of settled) {
    allMatches.push(...group);
  }

  return allMatches;
}

/**
 * Main function to fetch real matches for a sport, date and optional time range
 */
export async function getRealMatchesForDay(
  sportKey: string,
  dateStr: string,
  startTime?: string,
  endTime?: string,
  customQuery?: string,
  matchDepth: 'max' | 'standard' | 'compact' = 'max'
): Promise<RealMatchItem[]> {
  let results: RealMatchItem[] = [];
  const seenMatches = new Set<string>();

  const addMatch = (m: RealMatchItem) => {
    const key = `${m.homeTeam.toLowerCase().replace(/[\s\-_]/g, '')}_vs_${m.awayTeam.toLowerCase().replace(/[\s\-_]/g, '')}`;
    if (!seenMatches.has(key)) {
      seenMatches.add(key);
      results.push(m);
    }
  };

  // 1. Fetch from BC Marathon strictly for target date
  try {
    const marathonMatches = await fetchFromMarathon(sportKey, dateStr);
    for (const m of marathonMatches) {
      addMatch(m);
    }
    console.log(`Fetched ${marathonMatches.length} real matches from BC line for ${sportKey} on ${dateStr}`);
  } catch (err: any) {
    console.warn('Marathon line fetch error:', err?.message || err);
  }

  // 2. Fetch from LiveScore feed strictly for target date
  try {
    const liveScoreMatches = await fetchFromLiveScore(sportKey, dateStr);
    for (const m of liveScoreMatches) {
      addMatch(m);
    }
    console.log(`Fetched ${liveScoreMatches.length} matches from LiveScore feed for ${sportKey} on ${dateStr}`);
  } catch (err: any) {
    console.warn('LiveScore fetch error:', err?.message || err);
  }

  console.log(`Total unique real events parsed for ${dateStr}: ${results.length}`);

  // 3. Filter by custom query if user searched for specific match/team
  if (customQuery && customQuery.trim()) {
    const qLower = customQuery.toLowerCase().trim();
    const queryParts = qLower.split(/[\s\-–—vs.]+/).filter((w) => w.length >= 3);

    const matchedCustom = results.filter((m) => {
      const matchText = `${m.homeTeam} ${m.awayTeam} ${m.matchName} ${m.league}`.toLowerCase();
      if (matchText.includes(qLower)) return true;
      if (queryParts.length > 0 && queryParts.some((part) => matchText.includes(part))) return true;
      return false;
    });

    if (matchedCustom.length > 0) {
      // If user specified time range with custom match, apply time range filter if matches exist
      if (startTime || endTime) {
        const inTime = matchedCustom.filter((m) => isTimeInRange(m.time, startTime, endTime));
        if (inTime.length > 0) return inTime;
      }
      return matchedCustom;
    }
  }

  // 4. Strict filter by time range if provided (NO FALLBACK to other times)
  if (startTime || endTime) {
    results = results.filter((m) => isTimeInRange(m.time, startTime, endTime));
    console.log(`Filtered to ${results.length} matches in time range ${startTime || '00:00'} - ${endTime || '23:59'}`);
  }

  // 5. Filter and prioritize based on depth option:
  // Максимальный = все матчи (по максимуму)
  // Стандартный = только известные матчи (по максимуму)
  // Компактный = малопопулярные матчи (по максимуму)
  if (matchDepth === 'standard') {
    const known = results.filter((m) => (m.tier || 3) <= 2);
    if (known.length > 0) {
      results = known;
    }
    results.sort((a, b) => (a.tier || 3) - (b.tier || 3));
  } else if (matchDepth === 'compact') {
    const niche = results.filter((m) => (m.tier || 3) >= 3);
    if (niche.length > 0) {
      results = niche;
    }
  } else {
    // max: all matches
    results.sort((a, b) => (a.tier || 3) - (b.tier || 3));
  }

  // Cap at up to 1000 events
  return results.slice(0, 1000);
}
