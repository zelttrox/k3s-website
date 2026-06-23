require('dotenv/config')

const GITHUB_TOKEN = process.env.GITHUB_TOKEN

const query = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
            weekday
          }
        }
      }
    }
  }
}`

async function fetchContributions(login) {
  if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN not set')

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, variables: { login } })
  })

  // Read raw text first to avoid "Unexpected end of JSON input"
  const text = await res.text()
  if (!text) {
    throw new Error(`Empty response from GitHub API (status ${res.status})`)
  }

  let json
  try {
    json = JSON.parse(text)
  } catch (e) {
    throw new Error(`Invalid JSON from GitHub API: ${e.message} - body: ${text}`)
  }

  if (!res.ok) {
    const message = json && json.message ? json.message : `HTTP ${res.status}`
    throw new Error(`GitHub API error: ${message}`)
  }

  return json.data
}

module.exports = { fetchContributions }
