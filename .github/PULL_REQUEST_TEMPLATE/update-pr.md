## ESPN MCP Server Update

### Update Type
- [ ] ESPN API endpoint update
- [ ] Cache system improvement
- [ ] Configuration change
- [ ] Data refresh mechanism
- [ ] Performance optimization
- [ ] Bug fix
- [ ] New feature

### Changes Made
<!-- Describe the changes made in this PR -->

### ESPN API Changes
- [ ] Fixed 404 errors
- [ ] Updated endpoint URLs
- [ ] Added new endpoints
- [ ] Modified response handling
- [ ] Updated error handling

**Endpoints Modified:**
- [ ] `/teams` endpoints
- [ ] `/scoreboard` endpoints
- [ ] `/news` endpoints
- [ ] `/standings` endpoints
- [ ] `/roster` endpoints

### Tools Updated
- [ ] `search_athletes`
- [ ] `get_live_scores`
- [ ] `get_team_information`
- [ ] `get_league_standings`
- [ ] `get_sports_news`
- [ ] Other: _______________

### Breaking Changes
- [ ] No breaking changes
- [ ] API response format changes
- [ ] Configuration changes required
- [ ] Environment variable changes
- [ ] Tool parameter changes

### Testing Performed
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual ESPN API testing
- [ ] Cache functionality testing
- [ ] Performance testing
- [ ] Error handling testing

### ESPN API Testing
```bash
# Provide curl commands used for testing
curl -s "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams" | jq '.sports[0].leagues[0].teams | length'
# Expected: 30 NBA teams

curl -s "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/1/roster" | jq '.athletes | length'
# Expected: Team roster with player details
```

### Performance Impact
- **Response Time**: 
- **Memory Usage**: 
- **Cache Hit Rate**: 
- **API Call Reduction**: 

### Configuration Changes
```json
{
  "before": {
    "old": "configuration"
  },
  "after": {
    "new": "configuration"
  }
}
```

### Deployment Notes
- [ ] No special deployment requirements
- [ ] Requires cache clear
- [ ] Requires configuration update
- [ ] Requires environment variables
- [ ] Requires container restart

### Rollback Plan
<!-- Describe how to rollback this change if needed -->

### Documentation Updates
- [ ] README.md updated
- [ ] API documentation updated
- [ ] Configuration examples updated
- [ ] Deployment guide updated
- [ ] Troubleshooting guide updated

### Related Issues
<!-- Link to related issues -->
Fixes #
Closes #
Related to #

### Screenshots/Logs
<!-- If applicable, add screenshots or relevant log output -->

### Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] No breaking changes (or properly documented)
- [ ] ESPN API endpoints tested manually
- [ ] Cache functionality verified
- [ ] Performance impact assessed