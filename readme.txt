# ESPN Server

A server implementation that provides access to ESPN sports data through a Model Context Protocol (MCP) interface.

## Features

- Real-time sports data from ESPN's API
- Comprehensive coverage of major sports leagues:
  - NFL (National Football League)
  - NBA (National Basketball Association)
  - MLB (Major League Baseball)
  - NHL (National Hockey League)
  - WNBA (Women's National Basketball Association)
  - College Sports (Football, Basketball, Baseball)
  - Soccer (Multiple leagues)
- Data types include:
  - Live scores
  - Team information
  - Player statistics
  - League standings
  - News updates
  - Player props (NFL)
- Automatic markdown file generation for data exports

## Installation

1. Clone the repository
2. Install dependencies:

```sh
npm install
```

3. Build the project:

```sh
npm run build
```

## Usage

The server runs as a stdio-based MCP server. To start the server:

```sh
node build/index.js
```

## Available Tools

### NFL
- `get_nfl_scores` - Get live and final NFL scores
- `get_nfl_news` - Get latest NFL news
- `get_nfl_teams` - Get all NFL teams
- `get_nfl_team` - Get specific NFL team details
- `get_nfl_standings` - Get current NFL standings
- `get_nfl_player_stats` - Get player statistics
- `get_nfl_player_props` - Get player props

### NBA
- `get_nba_scores` - Get live and final NBA scores
- `get_nba_news` - Get latest NBA news
- `get_nba_teams` - Get all NBA teams
- `get_nba_team` - Get specific NBA team details
- `get_nba_standings` - Get current NBA standings
- `get_nba_player_stats` - Get player statistics

### MLB
- `get_mlb_scores` - Get live and final MLB scores
- `get_mlb_news` - Get latest MLB news
- `get_mlb_teams` - Get all MLB teams
- `get_mlb_team` - Get specific MLB team details
- `get_mlb_standings` - Get current MLB standings
- `get_mlb_player_stats` - Get player statistics

### NHL
- `get_nhl_scores` - Get live and final NHL scores
- `get_nhl_news` - Get latest NHL news
- `get_nhl_teams` - Get all NHL teams
- `get_nhl_team` - Get specific NHL team details
- `get_nhl_standings` - Get current NHL standings
- `get_nhl_player_stats` - Get player statistics

### College Sports
- Various tools for college football, basketball (men's and women's), and baseball

### Additional Features
- All data can be exported to markdown files
- Customizable output formatting
- Error handling for API requests
- Real-time data updates

## Dependencies

- [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk): ^0.6.0
- [axios](https://www.npmjs.com/package/axios): ^1.7.9
- [date-fns](https://www.npmjs.com/package/date-fns): ^4.1.0

## Development Dependencies

- [@types/node](https://www.npmjs.com/package/@types/node): ^20.10.0
- [typescript](https://www.npmjs.com/package/typescript): ^5.3.2

## License

This project is licensed under the MIT License.
