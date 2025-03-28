import { format } from 'date-fns';
export function formatScore(score) {
    const homeTeam = score.competitions[0].competitors.find((c) => c.homeAway === 'home');
    const awayTeam = score.competitions[0].competitors.find((c) => c.homeAway === 'away');
    const status = score.status.type.description;
    const time = status === 'Final' ? '' : score.status.displayClock;
    const venue = score.competitions[0].venue?.fullName;
    const broadcasts = score.competitions[0].broadcasts?.map((b) => b.names.join('/')).join(', ');
    const date = format(new Date(score.date), 'MMMM d, yyyy');
    let content = '';
    // Game introduction
    content += `Here's the game between the ${awayTeam.team.name} and the ${homeTeam.team.name}:\n\n`;
    // Game details in a more conversational format
    content += `The game is taking place on ${date}`;
    if (venue)
        content += ` at ${venue}`;
    content += '.\n\n';
    if (broadcasts)
        content += `You can watch this game on ${broadcasts}.\n\n`;
    // Score and status in a more natural way
    if (status === 'Final') {
        const homeScore = parseInt(homeTeam.score || '0');
        const awayScore = parseInt(awayTeam.score || '0');
        content += `Final Score: The ${homeScore > awayScore ? homeTeam.team.name : awayTeam.team.name} `;
        content += `${homeScore === awayScore ? 'tied' : 'won'} `;
        content += `${awayTeam.score || '0'}-${homeTeam.score || '0'}`;
    }
    else {
        content += `Current Score: ${awayTeam.team.name} ${awayTeam.score || '0'}, ${homeTeam.team.name} ${homeTeam.score || '0'}`;
        if (time)
            content += ` (${time} remaining)`;
    }
    content += '\n\n---\n\n';
    return content;
}
export function formatNews(article) {
    const date = format(new Date(article.published), 'MMMM d, yyyy h:mm a');
    const isPremium = article.premium;
    const byline = article.byline;
    let content = '';
    // Headline and description in a more natural way
    content += `${article.headline}\n\n`;
    content += `${article.description}\n\n`;
    // Article details in a conversational format
    let details = [];
    if (byline)
        details.push(`Written by ${byline}`);
    details.push(`Published ${format(new Date(article.published), 'MMMM d')}`);
    if (isPremium)
        details.push('This is a premium article');
    content += `${details.join(' • ')}\n\n`;
    content += `Read more at: ${article.links.web.href}\n\n`;
    content += '---\n\n';
    return content;
}
export function formatTeam(team) {
    const venue = team.venue?.fullName;
    const conference = team.conference?.name;
    const division = team.division?.name;
    let content = '';
    // Team introduction
    content += `Let me tell you about the ${team.displayName}:\n\n`;
    // Basic information in a conversational format
    content += `They're officially known as the ${team.name} and are based in ${team.location}. `;
    content += `You might also see them referred to as "${team.abbreviation}" in standings and scores.\n\n`;
    // League information
    if (conference || division) {
        content += 'In terms of league structure, ';
        if (conference)
            content += `they play in the ${conference}`;
        if (conference && division)
            content += ' and more specifically';
        if (division)
            content += ` in the ${division}`;
        content += '.\n\n';
    }
    // Venue information
    if (venue) {
        content += `The team plays their home games at ${venue}.\n\n`;
    }
    // Team colors
    if (team.color || team.alternateColor) {
        content += 'Their team colors are ';
        let colors = [];
        if (team.color)
            colors.push(team.color);
        if (team.alternateColor)
            colors.push(team.alternateColor);
        content += colors.join(' and ');
        content += '.\n\n';
    }
    content += '---\n\n';
    return content;
}
export function formatRanking(ranking) {
    // More natural ranking format
    return `${ranking.current}. The ${ranking.team.name} are currently ranked #${ranking.current} with a record of ${ranking.recordSummary}\n\n`;
}
export function formatPlayerStats(stats) {
    let content = '';
    // Player information
    content += `## ${stats.athlete.fullName}\n\n`;
    content += `Position: ${stats.athlete.position?.abbreviation || 'N/A'}\n`;
    content += `Team: ${stats.athlete.team?.name || 'N/A'}\n\n`;
    // Season stats
    if (stats.statistics) {
        content += '### Season Statistics\n\n';
        stats.statistics.forEach((stat) => {
            content += `- ${stat.name}: ${stat.value}\n`;
        });
        content += '\n';
    }
    // Recent performance
    if (stats.splits?.recent) {
        content += '### Recent Performance\n\n';
        stats.splits.recent.forEach((game) => {
            content += `${game.date}: ${game.summary}\n`;
        });
        content += '\n';
    }
    content += '---\n\n';
    return content;
}
export function formatPlayerProps(props) {
    let content = '';
    // Player information
    content += `## ${props.player.fullName} (${props.player.position})\n\n`;
    content += `Team: ${props.player.team.name}\n\n`;
    // Props information
    if (props.props) {
        content += '### Available Props:\n\n';
        props.props.forEach((prop) => {
            content += `- ${prop.name}: ${prop.line} (Over: ${prop.overOdds}, Under: ${prop.underOdds})\n`;
        });
        content += '\n';
    }
    content += '---\n\n';
    return content;
}
export function formatStandings(standings) {
    let content = '';
    // Division/Conference name if available
    if (standings.name) {
        content += `## ${standings.name}\n\n`;
    }
    // Table header
    content += '| Team | W | L | PCT | GB | L10 | STRK |\n';
    content += '|------|---|---|-----|----|----|------|\n';
    // Team records
    standings.teams.forEach((team) => {
        const record = team.record;
        content += `| ${team.name} | ${record.wins} | ${record.losses} | ${record.percentage} | ${record.gamesBack || '-'} | ${record.last10 || '-'} | ${record.streak || '-'} |\n`;
    });
    content += '\n---\n\n';
    return content;
}
export function createMarkdownTitle(type, league) {
    const date = format(new Date(), 'MMMM d, yyyy');
    let title = `Here's the latest ${type.toLowerCase()} for ${league}:\n\n`;
    title += `*Information current as of ${date}*\n\n`;
    return title;
}
