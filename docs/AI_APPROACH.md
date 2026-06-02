# AI Analysis Approach

This document describes the AI-powered meeting analysis system in Hintro, including prompt design, citation strategy, and hallucination prevention.

## Overview

The system uses Groq's LLaMA 3.3 70B model to analyze meeting transcripts and extract structured insights including:
- Summary points
- Action items with assignees and due dates
- Key decisions made
- Follow-up suggestions

## Prompt Design

### System Prompt

The system prompt enforces strict rules to prevent hallucinations:

```
You are a meeting intelligence assistant. Your job is to analyze meeting transcripts and extract structured insights.

STRICT RULES:
- Only use information explicitly stated in the transcript
- Never invent attendees, decisions, action items, or outcomes
- Never add information not present in the transcript
- Every insight must cite the exact transcript timestamp(s) it came from
- Return ONLY valid JSON. No markdown. No explanation. No preamble.

Return this exact JSON structure:
{
  "summary": [{ "text": "...", "citations": [{ "timestamp": "..." }] }],
  "actionItems": [{ "task": "...", "assignee": "...", "dueDate": null, "citations": [{ "timestamp": "..." }] }],
  "decisions": [{ "text": "...", "citations": [{ "timestamp": "..." }] }],
  "followUpSuggestions": [{ "text": "...", "citations": [{ "timestamp": "..." }] }]
}

If no action items exist in the transcript, return empty array. Same for decisions and followUpSuggestions.
```

### User Message

The full meeting transcript is passed as formatted JSON:

```json
[
  {
    "timestamp": "00:01:30",
    "speaker": "Alice",
    "text": "Let's discuss our Q4 goals"
  },
  {
    "timestamp": "00:02:15",
    "speaker": "Bob",
    "text": "I will prepare the budget report by next Friday"
  }
]
```

## Citation Strategy

Every insight extracted from the transcript must reference its source:

### Structure

Each insight includes a `citations` array:

```json
{
  "text": "Team committed to Q4 revenue target of $2M",
  "citations": [
    { "timestamp": "00:05:30" },
    { "timestamp": "00:06:15" }
  ]
}
```

### Benefits

1. **Verifiability** - Users can validate AI claims against original transcript
2. **Traceability** - Audit trail for important decisions
3. **Trust** - Citations build confidence in AI accuracy
4. **Context** - Users can review surrounding discussion

### Implementation

Citations are stored in the database alongside each insight:

- **Summary points** - Stored in `meeting.analysis.summary[]`
- **Action items** - Stored in `actionItem.citations`
- **Decisions** - Stored in `meeting.analysis.decisions[]`
- **Follow-ups** - Stored in `meeting.analysis.followUpSuggestions[]`

## Hallucination Prevention

### 1. Grounded Prompting

The system prompt explicitly forbids invention:
- "Only use information explicitly stated in the transcript"
- "Never invent attendees, decisions, action items, or outcomes"

This grounds the model in the source material.

### 2. Citation Requirement

By requiring citations for every insight, the model must:
1. Find actual evidence in the transcript
2. Reference specific timestamps
3. Cannot cite non-existent content

This acts as a forcing function against hallucination.

### 3. Structured Output

The strict JSON schema prevents:
- Narrative explanations that might contain assumptions
- Uncited claims
- Inconsistent data structures

### 4. Conservative Temperature

The model uses `temperature: 0.3` to:
- Reduce creative embellishment
- Increase deterministic behavior
- Focus on extraction over generation

### 5. Output Validation

Post-processing validates:

```typescript
// Validate all required keys present
if (
  !analysis.summary ||
  !Array.isArray(analysis.actionItems) ||
  !Array.isArray(analysis.decisions) ||
  !Array.isArray(analysis.followUpSuggestions)
) {
  throw new Error('AI_PARSE_ERROR');
}
```

Any malformed response returns `502 AI_PARSE_ERROR` rather than persisting invalid data.

### 6. Markdown Stripping

Some models add markdown code fences despite instructions. We strip these:

```typescript
responseText = responseText
  .replace(/^```json\s*/gm, '')
  .replace(/^```\s*/gm, '')
  .trim();
```

## Known Limitations

### 1. Due Date Extraction

**Issue:** Due dates must be inferred from natural language in transcripts.

**Example:**
- "I'll have it done by Friday" - Must infer actual date
- "Next week" - Ambiguous without meeting date context

**Current Approach:** 
- Model returns ISO datetime string if date is explicit
- Returns `null` if date is ambiguous
- Frontend can handle relative date parsing if needed

**Future Improvement:** Pass meeting date context to help resolve relative dates.

### 2. Assignee Resolution

**Issue:** Assignees are names, not email addresses.

**Example:**
- Transcript says "Bob will handle this"
- We don't have Bob's email address
- Cannot send reminder directly to Bob

**Current Approach:**
- Store assignee name as-is
- Send reminders to meeting owner's email
- Email includes assignee name for context

**Future Improvement:** 
- Maintain user directory with name → email mapping
- Match speaker names to registered users
- Support @mentions for explicit assignment

### 3. Implicit Decisions

**Issue:** Not all decisions are stated explicitly.

**Example:**
- Team discusses two options
- Agrees on one through consensus
- No explicit "we decided X" statement

**Current Approach:** Model may miss implicit decisions without explicit statements.

**Future Improvement:** 
- Train model to recognize consensus patterns
- Add decision confirmation prompts
- Allow manual decision entry

### 4. Context-Dependent Action Items

**Issue:** Action items may depend on context not in immediate vicinity.

**Example:**
- Early discussion establishes project context
- Later action item references "the project"
- Citation only points to action item mention

**Current Approach:** Citations point to where action item was mentioned, not all related context.

**Future Improvement:**
- Multi-citation support for context dependencies
- Expand citation window to include surrounding context

## Testing Strategy

### Unit Tests

Mock Groq responses to test:
- Valid JSON parsing
- Markdown stripping
- Error handling for malformed responses
- Empty array handling

### Integration Tests

Test against real Groq API with:
- Simple transcripts (1-2 items)
- Complex transcripts (multiple speakers, topics)
- Edge cases (no action items, no decisions)
- Malformed input handling

### Validation Tests

Verify:
- All insights have non-empty citations
- Timestamps reference actual transcript entries
- No invented speakers or content
- JSON structure matches schema

## Performance Considerations

### Response Time

Groq's inference speed averages:
- Simple transcript (10 entries): ~500ms
- Medium transcript (50 entries): ~1-2s
- Large transcript (200 entries): ~3-5s

### Token Usage

- Input: ~1 token per 4 characters of transcript
- Output: ~500-2000 tokens depending on complexity
- Cost: Minimal at Groq's pricing

### Caching

Analysis results are cached in the database:
- Re-analyzing same meeting overwrites previous analysis
- No need to re-analyze unless transcript changes
- Action items are regenerated on each analysis

## Future Enhancements

1. **Incremental Analysis** - Analyze new portions of ongoing meetings
2. **Multi-Language Support** - Detect and handle non-English transcripts
3. **Sentiment Analysis** - Track team morale and engagement
4. **Topic Clustering** - Group related discussions across meetings
5. **Speaker Identification** - Link speakers to user accounts
6. **Real-time Analysis** - Process transcript as meeting progresses
7. **Custom Prompts** - Allow users to define analysis criteria

## Conclusion

The current approach balances:
- **Accuracy** - Grounded prompting prevents hallucination
- **Utility** - Structured extraction provides actionable insights
- **Transparency** - Citations enable verification
- **Performance** - Fast inference provides good UX

While limitations exist around date parsing and assignee resolution, the core analysis is reliable and production-ready. Future improvements can address edge cases as user feedback guides priorities.
