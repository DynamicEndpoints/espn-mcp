---
name: ESPN API Update
about: Report ESPN API changes or request endpoint updates
title: '[API UPDATE] '
labels: ['api-update', 'enhancement']
assignees: ''
---

## ESPN API Update Request

### API Endpoint Information
- **Sport**: 
- **League**: 
- **Endpoint**: 
- **Current Status**: [ ] Working [ ] 404 Error [ ] Format Changed [ ] New Endpoint Needed

### Issue Description
<!-- Describe the API update needed -->

### Current Behavior
<!-- What is currently happening? -->

### Expected Behavior
<!-- What should happen instead? -->

### ESPN API Details
- **Old Endpoint**: `https://site.api.espn.com/apis/site/v2/sports/...`
- **New Endpoint**: `https://site.api.espn.com/apis/site/v2/sports/...`
- **HTTP Status**: 
- **Response Format Changes**: 

### Impact Assessment
- [ ] Tool affected: `search_athletes`
- [ ] Tool affected: `get_live_scores`
- [ ] Tool affected: `get_team_information`
- [ ] Tool affected: `get_league_standings`
- [ ] Tool affected: `get_sports_news`
- [ ] Other tools affected: 

### Test Data
```bash
# Provide curl commands to test the endpoint
curl -s "https://site.api.espn.com/apis/site/v2/sports/..." | jq
```

### Additional Context
<!-- Any other information that would help understand the update -->

### Checklist
- [ ] I have tested the endpoint manually
- [ ] I have checked for alternative endpoints
- [ ] I have reviewed the ESPN API documentation
- [ ] I have identified which MCP tools are affected